require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const Joi = require('joi');
const router = express.Router();
const tf = require('@tensorflow/tfjs-node');


const app = express();
const port = process.env.PORT 
const secretKey = process.env.SECRET_KEY || 'defaultSecretKey';

// Configurer la connexion à la base de données MySQL
const db = mysql.createPool({
  host: process.env.MYSQL_INSTANCE_NAME || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DB_NAME || 'proje',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));


// Schémas de validation
const registerSchema = Joi.object({
  adi: Joi.string().required(),
  soyadi: Joi.string().required(),
  eposta: Joi.string().email().required(),
  sifre: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  eposta: Joi.string().email().required(),
  sifre: Joi.string().required(),
});

// Route pour l'inscription
app.post('/register', async (req, res, next) => {
  const { error } = registerSchema.validate(req.body);
  if (error) return res.status(400).send({ message: error.details[0].message });

  const { adi, soyadi, eposta, sifre } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(sifre, 10);
    const sql = 'INSERT INTO kullanicilar (adi, soyadi, eposta, sifre) VALUES (?, ?, ?, ?)';
    await db.execute(sql, [adi, soyadi, eposta, hashedPassword]);
    res.status(201).send({ message: 'Utilisateur ajouté avec succès.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).send({ message: 'Email déjà utilisé.' });
    }
    next(err);
  }
});

// Route pour la connexion
app.post('/login', async (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).send({ message: error.details[0].message });

  const { eposta, sifre } = req.body;

  try {
    const sql = 'SELECT * FROM kullanicilar WHERE eposta = ?';
    const [results] = await db.execute(sql, [eposta]);
    if (results.length === 0) return res.status(401).send({ message: 'Utilisateur non trouvé.' });

    const kullanici = results[0];
    const isMatch = await bcrypt.compare(sifre, kullanici.sifre);

    if (!isMatch) return res.status(401).send({ message: 'Mot de passe incorrect.' });

    const token = jwt.sign({ id: kullanici.id, rol: kullanici.rol }, secretKey, { expiresIn: '1h' });
    res.status(200).send({ message: 'Connexion réussie.', token });
  } catch (err) {
    next(err);
  }
});

// Routes pour les fichiers spécifiques
app.get('/public/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/public/Product.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Product.html'));
});

app.get('/public/custommers.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'custommers.html'));
});

app.get('/public/satis.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'satis.html'));
});

app.get('/public/indirim.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'indirim.html'));
});
app.get('/public/iade.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'iade.html'));
});
app.get('/public/iventaire.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'iventaire.html'));
});
app.get('/public/pourchasse.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pourchasse.html'));
});
app.get('/public/report.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report.html'));
});
app.get('/public/stock_tahmini.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stock_tahmini.html'));
});

app.get('/api/dashboard-stats', (req, res) => {
  const data = {
    products: 20,
    categories: 5,
    customers: 15,
    alerts: 8,
  };
  res.json(data);
});

app.get('/api/bar-chart-data', (req, res) => {
  const data = {
    series: [
      {
        data: [33, 10, 11, 8, 24],
        name: 'Products',
      },
    ],
    categories: ['Laptop', 'Phone', 'Tablet', 'Headphones', 'Camera'],
  };
  res.json(data);
});

// Exemple de route pour les données du area chart
app.get('/api/area-chart-data', (req, res) => {
  const data = {
    series: [
      {
        name: 'Purchase Orders',
        data: [35, 45, 30, 55, 50, 120, 110],
      },
      {
        name: 'Sales Orders',
        data: [15, 35, 50, 35, 40, 60, 50],
      },
    ],
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  };
  res.json(data);
});

// Route pour récupérer les produits
app.get('/api/urunler', async (req, res, next) => {
  try {
    const sql = 'SELECT * FROM urunler';
    const [results] = await db.execute(sql);
    res.status(200).json(results);
  } catch (err) {
    console.error('Erreur lors de la récupération des produits :', err);
    next(err);
  }
});

// Route pour récupérer les clients
app.get('/api/musteriler', async (req, res, next) => {
  try {
    const sql = 'SELECT * FROM musteriler';
    const [results] = await db.execute(sql);
    res.status(200).json(results);
  } catch (err) {
    console.error('Erreur lors de la récupération des clients :', err);
    next(err);
  }
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Une erreur est survenue sur le serveur.' });
});

app.get('/api/achats', async (req, res) => {
  const [rows] = await db.query(`
      SELECT 
          satislar.id AS id,
          musteriler.ad AS client_nom,
          musteriler.soyad AS client_prenom,
          urunler.ad AS produit_nom,
          satislar.adet AS quantite,
          urunler.fiyat AS prix_unitaire,
          (satislar.adet * urunler.fiyat) AS total,
          satislar.tarih AS date
      FROM satislar
      JOIN musteriler ON satislar.musteri_id = musteriler.id
      JOIN urunler ON satislar.urun_id = urunler.id
  `);
  res.json(rows);
});

app.get('/api/produits-remises', async (req, res) => {
  try {
      const [rows] = await db.query(`
          SELECT 
              urunler.ad AS produit,
              urunler.fiyat AS prix_original,
              COALESCE(
                  CASE 
                      WHEN indirimler.type = 'Yüzde' THEN urunler.fiyat - (urunler.fiyat * indirimler.valeur / 100)
                      WHEN indirimler.type = 'Miktar' THEN urunler.fiyat - indirimler.valeur
                      ELSE urunler.fiyat
                  END, 
                  urunler.fiyat
              ) AS prix_final
          FROM urunler
          LEFT JOIN indirimler 
              ON urunler.id = indirimler.urun_id 
              AND CURDATE() BETWEEN indirimler.date_debut AND indirimler.date_fin
      `);
      res.json(rows);
  } catch (error) {
      console.error('Erreur lors de la récupération des produits avec remises:', error);
      res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/chiffre-affaires', async (req, res) => {
  try {
      const [rows] = await db.query(`
          SELECT SUM(satislar.adet * urunler.fiyat) AS chiffre_affaires
          FROM satislar
          JOIN urunler ON satislar.urun_id = urunler.id
      `);
      res.json(rows[0]);
  } catch (error) {
      console.error('Erreur lors de la récupération du chiffre d\'affaires:', error);
      res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/produits-populaires', async (req, res) => {
  try {
      const [rows] = await db.query(`
          SELECT 
              urunler.ad AS produit,
              SUM(satislar.adet) AS quantite_totale
          FROM satislar
          JOIN urunler ON satislar.urun_id = urunler.id
          GROUP BY urunler.ad
          ORDER BY quantite_totale DESC
          LIMIT 5
      `);
      res.json(rows);
  } catch (error) {
      console.error('Erreur lors de la récupération des produits populaires:', error);
      res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/meilleurs-clients', async (req, res) => {
  try {
      const [rows] = await db.query(`
          SELECT 
              musteriler.ad AS client,
              musteriler.soyad AS prenom,
              COUNT(satislar.id) AS nombre_achats
          FROM satislar
          JOIN musteriler ON satislar.musteri_id = musteriler.id
          GROUP BY musteriler.id
          ORDER BY nombre_achats DESC
          LIMIT 5
      `);
      res.json(rows);
  } catch (error) {
      console.error('Erreur lors de la récupération des meilleurs clients:', error);
      res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/inventaire/stock-actuel', async (req, res) => {
  try {
      const [rows] = await db.query(`
          SELECT 
              urunler.ad AS produit,
              urunler.stok AS stock_initial,
              COALESCE(SUM(inventaire.quantite), 0) AS mouvement_total,
              (urunler.stok + COALESCE(SUM(inventaire.quantite), 0)) AS stock_actuel
          FROM urunler
          LEFT JOIN inventaire ON urunler.id = inventaire.urun_id
          GROUP BY urunler.id
      `);
      res.json(rows);
  } catch (error) {
      console.error('Erreur lors de la récupération du stock actuel:', error);
      res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/inventaire/stock-critique', async (req, res) => {
  try {
      const [rows] = await db.query(`
          SELECT 
              urunler.ad AS produit,
              urunler.stok AS stock_initial,
              (urunler.stok + COALESCE(SUM(inventaire.quantite), 0)) AS stock_actuel
          FROM urunler
          LEFT JOIN inventaire ON urunler.id = inventaire.urun_id
          GROUP BY urunler.id
          HAVING stock_actuel < 20
      `);
      res.json(rows);
  } catch (error) {
      console.error('Erreur lors de la récupération du stock critique:', error);
      res.status(500).json({ message: 'Erreur serveur' });
  }
});
app.get('/api/inventaire/produits-populaires', async (req, res) => {
  try {
      const [rows] = await db.query(`
          SELECT 
              urunler.ad AS produit,
              ABS(SUM(inventaire.quantite)) AS ventes_totales
          FROM inventaire
          JOIN urunler ON inventaire.urun_id = urunler.id
          WHERE inventaire.type = 'Satış'
          GROUP BY urunler.id
          ORDER BY ventes_totales DESC
          LIMIT 5
      `);
      res.json(rows);
  } catch (error) {
      console.error('Erreur lors de la récupération des produits les plus vendus:', error);
      res.status(500).json({ message: 'Erreur serveur' });
  }
});
app.get('/api/inventaire/ventes-retours', async (req, res) => {
  try {
      const [rows] = await db.query(`
          SELECT 
              urunler.ad AS produit,
              ABS(SUM(CASE WHEN inventaire.type = 'Satış' THEN inventaire.quantite ELSE 0 END)) AS ventes_totales,
              SUM(CASE WHEN inventaire.type = 'Müşteri iadesi' THEN inventaire.quantite ELSE 0 END) AS retours_totaux,
              ABS(SUM(CASE WHEN inventaire.type = 'Satış' THEN inventaire.quantite * urunler.fiyat ELSE 0 END)) AS chiffre_affaires
          FROM inventaire
          JOIN urunler ON inventaire.urun_id = urunler.id
          GROUP BY urunler.id
      `);
      res.json(rows);
  } catch (error) {
      console.error('Erreur lors de la récupération des données de ventes et retours:', error);
      res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Endpoint pour récupérer les clients
app.get('/api/clients', async (req, res) => {
  try {
    const sql = 'SELECT * FROM musteriler';
    const [results] = await db.execute(sql);
    res.status(200).json(results);
  } catch (error) {
    console.error('Erreur serveur :', error.message); // Affiche l'erreur dans la console
    res.status(500).json({ error: error.message });   // Envoie l'erreur au client
  }
});


// Créer une commande d'achat
// Route POST pour créer une commande d'achat
app.post('/api/purchase-orders', async (req, res) => {
  const { fournisseur_id, date, items } = req.body;

  try {
      // Créer la commande d'achat
      const [result] = await db.query('INSERT INTO purchase_orders (fournisseur_id, date, total) VALUES (?, ?, ?)', 
          [fournisseur_id, date, 0]);

      const purchaseOrderId = result.insertId;

      // Ajouter les items de la commande
      let total = 0;
      for (const item of items) {
          const { urun_id, quantite, prix_unitaire } = item;
          total += quantite * prix_unitaire;

          await db.query('INSERT INTO purchase_order_items (purchase_order_id, urun_id, quantite, prix_unitaire) VALUES (?, ?, ?, ?)', 
              [purchaseOrderId, urun_id, quantite, prix_unitaire]);

          // Mettre à jour le stock
          await db.query('UPDATE urunler SET stok = stok + ? WHERE id = ?', [quantite, urun_id]);
      }

      // Mettre à jour le total de la commande
      await db.query('UPDATE purchase_orders SET total = ? WHERE id = ?', [total, purchaseOrderId]);

      res.status(201).json({ message: 'Commande d\'achat créée avec succès', id: purchaseOrderId });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Route GET pour récupérer toutes les commandes d'achat
app.get('/api/purchase-orders', async (req, res) => {
  try {
      const [rows] = await db.query('SELECT * FROM purchase_orders');
      res.status(200).json(rows);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.get('/api/retours-produits', async (req, res) => {
  const query = `
      SELECT 
          p.ad AS produit, 
          COUNT(r.id) AS nombre_retours
      FROM urunler p
      LEFT JOIN satislar s ON p.id = s.urun_id
      LEFT JOIN retours r ON s.id = r.satis_id
      GROUP BY p.ad
  `;

  try {
      const [results] = await db.query(query); // Pas besoin de "promise()" ici, car il est déjà activé
      res.json(results);
  } catch (error) {
      console.error('Erreur détaillée:', error); // Log détaillé
      res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/rapport', async (req, res) => {
  try {
    // Chiffre d'affaires total
    const [chiffreAffaires] = await db.query(`
      SELECT SUM(satislar.adet * urunler.fiyat) AS total_ventes
      FROM satislar
      JOIN urunler ON satislar.urun_id = urunler.id
    `);

    // Meilleurs produits
    const [meilleursProduits] = await db.query(`
      SELECT 
        urunler.ad AS produit,
        SUM(satislar.adet) AS quantite_totale
      FROM satislar
      JOIN urunler ON satislar.urun_id = urunler.id
      GROUP BY urunler.ad
      ORDER BY quantite_totale DESC
      LIMIT 5
    `);

    // Meilleurs clients
    const [meilleursClients] = await db.query(`
      SELECT 
        musteriler.ad AS client_nom,
        musteriler.soyad AS client_prenom,
        COUNT(satislar.id) AS nombre_achats,
        SUM(satislar.adet * urunler.fiyat) AS total_depense
      FROM satislar
      JOIN musteriler ON satislar.musteri_id = musteriler.id
      JOIN urunler ON satislar.urun_id = urunler.id
      GROUP BY musteriler.id
      ORDER BY total_depense DESC
      LIMIT 5
    `);

    // Chiffre d'affaires par mois
    const [ventesParMois] = await db.query(`
      SELECT 
        MONTH(satislar.tarih) AS mois,
        SUM(satislar.adet * urunler.fiyat) AS total_ventes
      FROM satislar
      JOIN urunler ON satislar.urun_id = urunler.id
      GROUP BY MONTH(satislar.tarih)
      ORDER BY mois ASC
    `);

    // Construction du rapport
    const rapport = {
      chiffreAffairesTotal: chiffreAffaires[0]?.total_ventes || 0,
      meilleursProduits,
      meilleursClients,
      ventesParMois,
    };

    res.status(200).json(rapport);
  } catch (error) {
    console.error('Erreur lors de la génération du rapport:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du rapport.' });
  }
});


app.get('/api/forecast', async (req, res) => {
    let connection;

    try {
        // Établir une connexion à la base de données
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'proje'
        });

        // Récupérer les données de stock depuis la base de données
        const [results] = await connection.execute(
            'SELECT date_mouvement AS date, quantite AS price FROM inventaire WHERE type = "Satış" ORDER BY date_mouvement'
        );

        if (!results.length) {
            return res.status(404).json({ message: 'Aucune donnée disponible pour les prévisions.' });
        }

        // Extraire les dates et les quantités
        const dates = results.map(row => new Date(row.date).getTime());
        const prices = results.map(row => row.price);

        // Fonction de régression linéaire
        const regression = (x, y) => {
            const n = x.length;
            const meanX = x.reduce((sum, xi) => sum + xi, 0) / n;
            const meanY = y.reduce((sum, yi) => sum + yi, 0) / n;
            const slope = x.reduce((acc, xi, i) => acc + (xi - meanX) * (y[i] - meanY), 0) /
                          x.reduce((acc, xi) => acc + Math.pow(xi - meanX, 2), 0);
            const intercept = meanY - slope * meanX;
            return xi => slope * xi + intercept;
        };

        // Prédictions
        const predict = regression(dates, prices);
        const predictions = dates.map(d => Math.round(predict(d)));

        // Répondre avec les prédictions et les dates
        res.json({ predictions, dates: results.map(row => row.date) });
    } catch (error) {
        console.error('Erreur lors des prévisions:', error.message);
        res.status(500).json({ message: 'Erreur lors des prévisions.' });
    } finally {
        // Fermer la connexion à la base de données
        if (connection) {
            await connection.end();
        }
    }
});



// Démarrer le serveur
app.listen(port, async () => {
  try {
    await db.getConnection(); // Tester la connexion à la base de données
    console.log('Connecté à la base de données MySQL.');
    console.log(`Serveur démarré sur http://localhost:${port}`);
  } catch (err) {
    console.error('Erreur lors de la connexion à la base de données :', err);
    process.exit(1); // Quitter le processus si la connexion échoue
  }
});

