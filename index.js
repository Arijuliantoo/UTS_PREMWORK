const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Koneksi database
const db = mysql.createConnection({

  
  host: "localhost",
  user: "root",
  password: "", // sesuaikan jika ada password
  database: "dana_kas",
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection error:", err);
    process.exit(1);
  }
  console.log("Connected to MySQL database.");
});

// Home route
app.get("/", (req, res) => {
  res.send("Ari julianto");
});

// ======================= ROUTE: DASHBOARD ============================
app.get("/api/dashboard", (req, res) => {
  const masukSql = "SELECT IFNULL(SUM(jumlah),0) AS total_masuk FROM transaksi WHERE jenis = 'masuk'";
  const keluarSql = "SELECT IFNULL(SUM(jumlah),0) AS total_keluar FROM transaksi WHERE jenis = 'keluar'";

  db.query(masukSql, (err, masukResults) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query(keluarSql, (err, keluarResults) => {
      if (err) return res.status(500).json({ error: err.message });

      const total_masuk = masukResults[0].total_masuk;
      const total_keluar = keluarResults[0].total_keluar;
      const saldo = total_masuk - total_keluar;

      res.json({ total_masuk, total_keluar, saldo });
    });
  });
});

// ======================= ROUTE: AKUN ============================
app.get("/api/akun", (req, res) => {
  db.query("SELECT * FROM akun", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/akun", (req, res) => {
  const { no_akun, nama_akun } = req.body;
  if (!no_akun || !nama_akun) {
    return res.status(400).json({ error: "no_akun dan nama_akun wajib diisi" });
  }
  const query = "INSERT INTO akun (no_akun, nama_akun) VALUES (?, ?)";
  db.query(query, [no_akun, nama_akun], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ no_akun, nama_akun });
  });
});

app.put("/api/akun/:no_akun", (req, res) => {
  const { no_akun } = req.params;
  const { nama_akun } = req.body;
  if (!nama_akun) {
    return res.status(400).json({ error: "nama_akun wajib diisi" });
  }
  const query = "UPDATE akun SET nama_akun = ? WHERE no_akun = ?";
  db.query(query, [nama_akun, no_akun], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ no_akun, nama_akun });
  });
});

app.delete("/api/akun/:no_akun", (req, res) => {
  const { no_akun } = req.params;
  const query = "DELETE FROM akun WHERE no_akun = ?";
  db.query(query, [no_akun], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).send();
  });
});

// ======================= ROUTE: TRANSAKSI ============================
// GET all transaksi (with optional search)
app.get("/api/transaksi", (req, res) => {
  const search = req.query.search || "";
  let sql = `
    SELECT 
      t.id,
      t.tanggal,
      t.no_bukti,
      t.diterima_dari,
      CONCAT(a.no_akun, ' ', a.nama_akun) AS untuk_keperluan,
      t.jumlah,
      t.jenis
    FROM transaksi t
    LEFT JOIN akun a ON t.untuk_keperluan = a.no_akun
  `;
  let params = [];
  if (search) {
    sql += `
      WHERE t.no_bukti LIKE ? OR t.diterima_dari LIKE ? 
      OR CONCAT(a.no_akun, ' ', a.nama_akun) LIKE ?`;
    const likeSearch = `%${search}%`;
    params = [likeSearch, likeSearch, likeSearch];
  }
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST transaksi
app.post("/api/transaksi", (req, res) => {
  const { tanggal, no_bukti, diterima_dari, untuk_keperluan, jumlah, jenis } = req.body;
  if (!tanggal || !no_bukti || !diterima_dari || !untuk_keperluan || !jumlah || !jenis) {
    return res.status(400).json({ error: "Semua kolom wajib diisi" });
  }
  const query = `
    INSERT INTO transaksi (tanggal, no_bukti, diterima_dari, untuk_keperluan, jumlah, jenis)
    VALUES (?, ?, ?, ?, ?, ?)`;
  db.query(query, [tanggal, no_bukti, diterima_dari, untuk_keperluan, jumlah, jenis], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      id: results.insertId,
      tanggal,
      no_bukti,
      diterima_dari,
      untuk_keperluan,
      jumlah,
      jenis,
    });
  });
});

// PUT transaksi by id
app.put("/api/transaksi/:id", (req, res) => {
  const { id } = req.params;
  const { tanggal, no_bukti, diterima_dari, untuk_keperluan, jumlah, jenis } = req.body;
  if (!tanggal || !no_bukti || !diterima_dari || !untuk_keperluan || !jumlah || !jenis) {
    return res.status(400).json({ error: "Semua kolom wajib diisi" });
  }
  const query = `
    UPDATE transaksi 
    SET tanggal = ?, no_bukti = ?, diterima_dari = ?, untuk_keperluan = ?, jumlah = ?, jenis = ?
    WHERE id = ?`;
  db.query(query, [tanggal, no_bukti, diterima_dari, untuk_keperluan, jumlah, jenis, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id, tanggal, no_bukti, diterima_dari, untuk_keperluan, jumlah, jenis });
  });
});

// DELETE transaksi by id
app.delete("/api/transaksi/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM transaksi WHERE id = ?";
  db.query(query, [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).send();
  });
});

// ======================= START SERVER ============================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
