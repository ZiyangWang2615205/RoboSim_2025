import express from "express";
import fs from "fs";
import path from "path";
import APIRouter from "../api/api.js";
import { Server as HttpServer } from "http";
//here import vite stuff
import { createServer } from "vite";
import { SSEManager, SSEParams } from "./sse.js";
import verifySessionIDMiddleware from "./middleware.js";
import cookieParser from "cookie-parser";

export interface ServerParams extends SSEParams {}

export class Server {
    server: HttpServer | null = null;
    private viteServer : any | null = null; // make viteServer as var
    _sse: SSEManager;

    constructor({ getClient }: ServerParams) {
        this._sse = new SSEManager({ getClient });
    }

    async serve(port: number): Promise<void> {
        const app = express();

        app.use(cookieParser());

        app.use(verifySessionIDMiddleware);

        if (process.env.LOG_REQUESTS) {
            app.use((req, res, next) => {
                console.log(req.method, req.path);
                next();
            });
        }

        this._sse.setup(app);

        app.use("/api", APIRouter);

        app.get("/follow", (req, res) => {
            res.status(404).end();
        });

        app.get("/summary", (req, res) => {
            res.status(404).end();
        });

        if (process.env.NODE_ENV == "production") {
            // In production, serve the HTML, CSS and JavaScript files from the build directory
            // This contains the output of `vite build` in `web-client`
            let build_dir = path.resolve("./build/client");

            let build_exists = fs.existsSync(
                path.join(build_dir, "index.html"),
            );

            if (!build_exists) {
                console.error("Web client build not available to be served");
                return;
            }

            app.use(express.static(build_dir));

            app.get("/follow/:id", (req, res) => {
                res.sendFile(path.join(build_dir, "follow/index.html"));
            });

            app.get("/summary/:id", (req, res) => {
                res.sendFile(path.join(build_dir, "summary/index.html"));
            });

            app.get("/summary/graph/:id", (req, res) => {
                res.sendFile(path.join(build_dir, "summary/graph/index.html"));
            });

            app.get("/replay/:id", (req, res) => {
                res.sendFile(path.join(build_dir, "replay/index.html"));
            });

            //add instructions mapping
            app.get("/instructions", (req, res) => {
            res.sendFile(path.join(build_dir, "instructions/index.html"));
            });

        } else {
            // In development mode (`npm run dev`), create a Vite dev server,
            // and use it as middleware
            //const viteServer -> this.viteServer
            this.viteServer = await createServer({
                server: { middlewareMode: true },
                root: "web-client",
                base: "/",
                appType: "mpa",
            });

            app.get("/follow/:id", (req, res) => {
                req.url = "/follow/index.html";
                this.viteServer.middlewares(req, res);
            });

            app.get("/summary/:id", (req, res) => {
                req.url = "/summary/index.html";
                this.viteServer.middlewares(req, res);
            });

            app.get("/summary/graph/:id", (req, res) => {
                req.url = "/summary/graph/index.html";
                this.viteServer.middlewares(req, res);
            });

            app.get("/replay/:id", (req, res) => {
                req.url = "/replay/index.html";
                this.viteServer.middlewares(req, res);
            });

            //add instructions page mapping
            app.get("/instructions", (req, res) => {
            req.url = "/instructions/index.html";
            this.viteServer.middlewares(req, res);
            });

            app.use(this.viteServer.middlewares);
        }

        await new Promise<void>((resolve) => {
            this.server = app.listen(port, () => {
                console.log(
                    "HTTP server is running on port http://localhost:" +
                        port +
                        "/",
                );

                resolve();
            });
        });
    }

    get sse(): SSEManager {
        return this._sse;
    }

    async close(): Promise<void> {
        if (this.viteServer) {
            await this.viteServer.close();//make sure viteServer close
            this.viteServer = null;
        }

        return new Promise((resolve, reject) => {
            if (this.server) {
                this.server.closeAllConnections();
                this.server.close((error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}
