const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("express-async-errors");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();
app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/health", (_req, res) => res.json({ ok: true, name: "SIG Checklist Operacional" }));
app.use("/auth", require("./routes/auth"));
app.use("/vehicles", require("./routes/vehicles"));
app.use("/checklists", require("./routes/checklists"));
app.use("/submissions", require("./routes/submissions"));
app.use("/users", require("./routes/users"));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Erro interno", detail: error.message });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend SIG Checklist rodando em http://localhost:${port}`));
