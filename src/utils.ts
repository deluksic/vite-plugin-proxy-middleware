import proxy from "http2-proxy";
import type { ProxyTableType } from "./index";

import { Connect, ProxyOptions } from "vite";
import * as http from "http";

export interface MiddleWareOptsType {
  viteProtocol: number | string;
  vitePort: number | string;
  mockPath: string;
  proxyTableMap: Exclude<ProxyTableType, string>;
}

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export function generateMiddlewareProxyTable({
  viteProtocol,
  vitePort,
  mockPath,
  proxyTableMap,
}: MiddleWareOptsType): Connect.HandleFunction {
  // let proxyTable;
  type ProxyTableElement = {
    proxyOptions: { hostname: string; port: number };
    rewrite: ProxyOptions["rewrite"];
    proxyPath: string;
  };
  let proxyTableResolved: ProxyTableElement[] = [];

  // try {
  //   proxyTable = require(path.resolve(__dirname, "../../config/proxy-table"));
  // } catch (error) {
  //   console.log("exports.generateMiddlewareProxyTable -> error", error);
  // }

  // 生成 proxyTableResolved （对应middlewares的格式进行遍历）

  for (const key in proxyTableMap) {
    const proxyPath = key;
    const { target, rewrite } = proxyTableMap[proxyPath];

    const [hostname, port] =
      target && target.split("//").pop().replace("/", "").split(":");

    const proxyOptions = {
      hostname,
      port: Number(port),
    };

    proxyTableResolved.push({
      proxyOptions,
      rewrite,
      proxyPath,
    });
  }

  return (
    req: Connect.IncomingMessage,
    res: http.ServerResponse,
    next: Connect.NextFunction
  ) => {
    /**
     * 拦截请求
     *  1. mock接口请求 代理 --> 本地vite服务
     *  2. 前端vite文件服务请求  代理 --> 本地h2
     *  3. 其它数据接口请求  代理 --> 测试环境的http服务
     */
    const { originalUrl } = req;
    if (originalUrl === undefined) {
      throw new Error(`Expected originalUrl to be defined, got 'undefined'.`);
    }
    for (let proxyOpts of proxyTableResolved) {
      const { rewrite, proxyOptions, proxyPath } = proxyOpts;
      const path = rewrite?.(originalUrl) ?? originalUrl;
      const proxyOptsResolved = { ...proxyOptions, path };

      if (req.originalUrl?.startsWith(proxyPath)) {
        if (req.originalUrl?.startsWith(mockPath)) {
          return proxy
            .web(req, res, {
              ...proxyOptsResolved,
              protocol: viteProtocol,
              port: vitePort,
            })
            ?.catch(console.error);
        } else {
          return proxy.web(req, res, proxyOptsResolved)?.catch(console.error);
        }
      }
    }
    next();
  };
}
