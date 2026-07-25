import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import type { AppCatalogModule } from "../apps/module.js";
import type {
  AuthenticatedSession,
  AuthModule,
} from "../auth/module.js";
import { AppError, notFoundError } from "../errors.js";
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from "./cookies.js";

export interface HttpAppOptions {
  auth: AuthModule;
  apps: AppCatalogModule;
  appOrigin: string;
  secureCookies: boolean;
  clientDirectory?: string;
}

type AsyncHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<void>;

function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}

function sessionFrom(response: Response): AuthenticatedSession {
  return (response.locals as { auth: AuthenticatedSession }).auth;
}

function parseAppId(rawId: string): number {
  const appId = Number(rawId);
  if (!Number.isSafeInteger(appId) || appId <= 0) {
    throw notFoundError();
  }
  return appId;
}

export function createHttpApp(options: HttpAppOptions) {
  const app = express();

  app.disable("x-powered-by");
  app.use((_request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.use(express.json({ limit: "16kb" }));

  app.use("/api", (request, _response, next) => {
    if (request.method === "GET" || request.method === "HEAD") {
      next();
      return;
    }

    if (request.headers.origin !== options.appOrigin) {
      next(
        new AppError(
          403,
          "ORIGIN_REJECTED",
          "The request origin is not allowed.",
        ),
      );
      return;
    }

    next();
  });

  const requireSession: RequestHandler = (request, response, next) => {
    try {
      const token = readSessionToken(request.headers.cookie);
      const authenticated = options.auth.authenticate(token);
      response.locals.auth = authenticated;
      if (token) {
        setSessionCookie(response, token, options.secureCookies);
      }
      next();
    } catch (error) {
      clearSessionCookie(response, options.secureCookies);
      next(error);
    }
  };

  app.post(
    "/api/auth/register",
    asyncHandler(async (request, response) => {
      const result = await options.auth.register(request.body ?? {});
      setSessionCookie(response, result.token, options.secureCookies);
      response.status(201).json({ user: result.user });
    }),
  );

  app.post(
    "/api/auth/login",
    asyncHandler(async (request, response) => {
      const result = await options.auth.login(request.body ?? {});
      setSessionCookie(response, result.token, options.secureCookies);
      response.json({ user: result.user });
    }),
  );

  app.get("/api/auth/session", requireSession, (_request, response) => {
    response.json({ user: sessionFrom(response).user });
  });

  app.post("/api/auth/logout", (request, response) => {
    options.auth.logout(readSessionToken(request.headers.cookie));
    clearSessionCookie(response, options.secureCookies);
    response.status(204).send();
  });

  app.get("/api/apps", requireSession, (_request, response) => {
    response.json({ apps: options.apps.list(sessionFrom(response).user.id) });
  });

  app.post("/api/apps", requireSession, (request, response, next) => {
    try {
      const appItem = options.apps.create(
        sessionFrom(response).user.id,
        request.body,
      );
      response.status(201).json({ app: appItem });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/apps/:id", requireSession, (request, response, next) => {
    try {
      const appItem = options.apps.update(
        sessionFrom(response).user.id,
        parseAppId(request.params.id),
        request.body,
      );
      response.json({ app: appItem });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/apps/:id", requireSession, (request, response, next) => {
    try {
      options.apps.delete(
        sessionFrom(response).user.id,
        parseAppId(request.params.id),
      );
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.use("/api", (_request, _response, next) => {
    next(notFoundError());
  });

  const clientDirectory = options.clientDirectory
    ? resolve(options.clientDirectory)
    : null;
  if (clientDirectory && existsSync(resolve(clientDirectory, "index.html"))) {
    app.use(express.static(clientDirectory));
    app.use((request, response, next) => {
      if (request.method === "GET" && !request.path.startsWith("/api")) {
        response.sendFile(resolve(clientDirectory, "index.html"));
        return;
      }
      next();
    });
  }

  const errorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next,
  ) => {
    if (error instanceof AppError) {
      response.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
      });
      return;
    }

    if (
      error instanceof SyntaxError &&
      "status" in error &&
      error.status === 400
    ) {
      response.status(400).json({
        error: {
          code: "INVALID_JSON",
          message: "The request body is not valid JSON.",
        },
      });
      return;
    }

    console.error("Unhandled server error", error);
    response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    });
  };
  app.use(errorHandler);

  return app;
}
