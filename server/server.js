// server/server.js
const path = require("path");
const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { Server: IOServer } = require("socket.io");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const app = express();
const server = http.createServer(app);
const io = new IOServer(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on ${PORT}`));
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// --- Configuración Passport GitHub (sin sesiones de servidor) ---
passport.use(
  new GitHubStrategy(
    {
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/auth/github/callback`,
    },
    (accessToken, refreshToken, profile, done) => {
      // Aquí recibes el perfil del usuario autenticado en GitHub
      return done(null, profile);
    }
  )
);

app.use(cookieParser());
app.use(passport.initialize());
app.use(express.json());

// --- Servir frontend estático ---
app.use(express.static(path.join(__dirname, "..", "client")));

// --- Helpers JWT ---
function signUserToken(profile) {
  const payload = {
    id: profile.id,
    name: profile.displayName || profile.username,
    username: profile.username,
    avatar:
      (profile.photos && profile.photos[0] && profile.photos[0].value) || null,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// --- Rutas OAuth ---
app.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email"], session: false })
);

app.get(
  "/auth/github/callback",
  passport.authenticate("github", {
    failureRedirect: "/?login=failed",
    session: false,
  }),
  (req, res) => {
    const token = signUserToken(req.user);
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd, // true en producción con HTTPS
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect("/");
  }
);

// --- Ruta protegida de ejemplo ---
app.get("/api/profile", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// --- Logout ---
app.post("/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

// ---------------- LÓGICA TIEMPO REAL: ENCUESTA SÍ/NO ----------------

// Mapa de usuario -> voto ('yes' | 'no')
const userVotes = new Map();

function computeTallies() {
  let yes = 0;
  let no = 0;
  for (const v of userVotes.values()) {
    if (v === "yes") yes++;
    else if (v === "no") no++;
  }
  const total = yes + no;
  const pYes = total ? Math.round((yes / total) * 100) : 0;
  const pNo = total ? 100 - pYes : 0;
  return { yes, no, total, pYes, pNo };
}

// Extraer token del header Cookie de Socket.IO
function tokenFromSocket(socket) {
  const cookieHeader = socket.request.headers.cookie || "";
  const parts = cookieHeader.split(";").map((c) => c.trim());
  const kv = Object.fromEntries(
    parts
      .filter(Boolean)
      .map((item) => {
        const idx = item.indexOf("=");
        return [decodeURIComponent(item.slice(0, idx)), decodeURIComponent(item.slice(idx + 1))];
      })
      .filter(([k]) => k)
  );
  return kv.token || null;
}

// Middleware de autenticación a nivel de socket (opcional, permitimos conectar sin login para ver resultados)
io.use((socket, next) => {
  try {
    const token = tokenFromSocket(socket);
    if (!token) {
      socket.data.user = null;
      return next();
    }
    const data = jwt.verify(token, JWT_SECRET);
    socket.data.user = { id: data.id, name: data.name };
    next();
  } catch {
    socket.data.user = null;
    next(); // Permitimos conectar pero sin poder votar
  }
});

io.on("connection", (socket) => {
  // Al conectar, enviamos resultados actuales
  socket.emit("results", computeTallies());

  // Votar
  socket.on("vote", (value) => {
    if (value !== "yes" && value !== "no") return;
    if (!socket.data.user) {
      socket.emit("error_msg", "Debes iniciar sesión para votar.");
      return;
    }
    userVotes.set(socket.data.user.id, value);
    // Difundir a todos los clientes
    io.emit("results", computeTallies());
  });

  // Petición de resultados explícita
  socket.on("get_results", () => {
    socket.emit("results", computeTallies());
  });
});

// Endpoint REST opcional para debug
app.get("/api/results", (req, res) => {
  res.json(computeTallies());
});

// --- Lanzar servidor ---
server.listen(PORT, () => {
  console.log(`Servidor en ${BASE_URL} (puerto ${PORT})`);
});
