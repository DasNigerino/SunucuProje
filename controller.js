const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { registerSchema, loginSchema } = require('../middleware/validation');
const db = require('../db');

const secretKey = process.SECRET_KEY || 'defaultSecretKey';

const registerUser = async (req, res, next) => {
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
};

const loginUser = async (req, res, next) => {
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
};

const getProducts = async (req, res, next) => {
    try {
        const sql = 'SELECT * FROM urunler';
        const [results] = await db.execute(sql);
        res.status(200).json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des produits :', err);
        next(err);
    }
};

const getCustomers = async (req, res, next) => {
    try {
        const sql = 'SELECT * FROM musteriler';
        const [results] = await db.execute(sql);
        res.status(200).json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des clients :', err);
        next(err);
    }
};

const getDashboardStats = (req, res) => {
    const data = {
        products: 20,
        categories: 5,
        customers: 15,
        alerts: 8,
    };
    res.json(data);
};

const getBarChartData = (req, res) => {
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
};

const getAreaChartData = (req, res) => {
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
};

const getPurchases = async (req, res, next) => {
    try {
        const sql = `
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
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error('Erreur lors de la récupération des achats :', err);
        next(err);
    }
};

const getDiscountedProducts = async (req, res, next) => {
    try {
        const sql = `
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
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error('Erreur lors de la récupération des produits avec remises :', err);
        next(err);
    }
};

const getRevenue = async (req, res, next) => {
    try {
        const sql = `
            SELECT SUM(satislar.adet * urunler.fiyat) AS chiffre_affaires
            FROM satislar
            JOIN urunler ON satislar.urun_id = urunler.id
        `;
        const [rows] = await db.query(sql);
        res.json(rows[0]);
    } catch (err) {
        console.error('Erreur lors de la récupération du chiffre d\'affaires :', err);
        next(err);
    }
};

const getPopularProducts = async (req, res, next) => {
    try {
        const sql = `
            SELECT 
                urunler.ad AS produit,
                SUM(satislar.adet) AS quantite_totale
            FROM satislar
            JOIN urunler ON satislar.urun_id = urunler.id
            GROUP BY urunler.ad
            ORDER BY quantite_totale DESC
            LIMIT 5
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error('Erreur lors de la récupération des produits populaires :', err);
        next(err);
    }
};

const getBestCustomers = async (req, res, next) => {
    try {
        const sql = `
            SELECT 
                musteriler.ad AS client,
                musteriler.soyad AS prenom,
                COUNT(satislar.id) AS nombre_achats
            FROM satislar
            JOIN musteriler ON satislar.musteri_id = musteriler.id
            GROUP BY musteriler.id
            ORDER BY nombre_achats DESC
            LIMIT 5
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error('Erreur lors de la récupération des meilleurs clients :', err);
        next(err);
    }
};

const getCurrentStock = async (req, res, next) => {
    try {
        const sql = `
            SELECT 
                urunler.ad AS produit,
                urunler.stok AS stock_initial,
                COALESCE(SUM(inventaire.quantite), 0) AS mouvement_total,
                (urunler.stok + COALESCE(SUM(inventaire.quantite), 0)) AS stock_actuel
            FROM urunler
            LEFT JOIN inventaire ON urunler.id = inventaire.urun_id
            GROUP BY urunler.id
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error('Erreur lors de la récupération du stock actuel :', err);
        next(err);
    }
};

const getCriticalStock = async (req, res, next) => {
    try {
        const sql = `
            SELECT 
                urunler.ad AS produit,
                urunler.stok AS stock_initial,
                (urunler.stok + COALESCE(SUM(inventaire.quantite), 0)) AS stock_actuel
            FROM urunler
            LEFT JOIN inventaire ON urunler.id = inventaire.urun_id
            GROUP BY urunler.id
            HAVING stock_actuel < 20
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error('Erreur lors de la récupération du stock critique :', err);
        next(err);
    }
};

const getPopularInventoryProducts = async (req, res, next) => {
    try {
        const sql = `
            SELECT 
                urunler.ad AS produit,
                ABS(SUM(inventaire.quantite)) AS ventes_totales
            FROM inventaire
            JOIN urunler ON inventaire.urun_id = urunler.id
            WHERE inventaire.type = 'Satış'
            GROUP BY urunler.id
            ORDER BY ventes_totales DESC
            LIMIT 5
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error('Erreur lors de la récupération des produits les plus vendus :', err);
        next(err);
    }
};

const getSalesReturns = async (req, res, next) => {
    try {
        const sql = `
            SELECT 
                urunler.ad AS produit,
                ABS(SUM(CASE WHEN inventaire.type = 'Satış' THEN inventaire.quantite ELSE 0 END)) AS ventes_totales,
                SUM(CASE WHEN inventaire.type = 'Müşteri iadesi' THEN inventaire.quantite ELSE 0 END) AS retours_totaux,
                ABS(SUM(CASE WHEN inventaire.type = 'Satış' THEN inventaire.quantite * urunler.fiyat ELSE 0 END)) AS chiffre_affaires
            FROM inventaire
            JOIN urunler ON inventaire.urun_id = urunler.id
            GROUP BY urunler.id
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error('Erreur lors de la récupération des données de ventes et retours :', err);
        next(err);
    }
};

const getClients = async (req, res, next) => {
    try {
        const sql = 'SELECT * FROM musteriler';
        const [results] = await db.execute(sql);
        res.status(200).json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des clients :', err);
        next(err);
    }
};

const createPurchaseOrder = async (req, res, next) => {
    const { fournisseur_id, date, items } = req.body;

    try {
        const [result] = await db.query('INSERT INTO purchase_orders (fournisseur_id, date, total) VALUES (?, ?, ?)', 
            [fournisseur_id, date, 0]);

        const purchaseOrderId = result.insertId;

        let total = 0;
        for (const item of items) {
            const { urun_id, quantite, prix_unitaire } = item;
            total += quantite * prix_unitaire;

            await db.query('INSERT INTO purchase_order_items (purchase_order_id, urun_id, quantite, prix_unitaire) VALUES (?, ?, ?, ?)', 
                [purchaseOrderId, urun_id, quantite, prix_unitaire]);

            await db.query('UPDATE urunler SET stok = stok + ? WHERE id = ?', [quantite, urun_id]);
        }

        await db.query('UPDATE purchase_orders SET total = ? WHERE id = ?', [total, purchaseOrderId]);

        res.status(201).json({ message: 'Commande d\'achat créée avec succès', id: purchaseOrderId });
    } catch (err) {
        console.error('Erreur lors de la création de la commande d\'achat :', err);
        next(err);
    }
};

const getPurchaseOrders = async (req, res, next) => {
    try {
        const sql = 'SELECT * FROM purchase_orders';
        const [rows] = await db.query(sql);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Erreur lors de la récupération des commandes d\'achat :', err);
        next(err);
    }
};

const getProductReturns = async (req, res, next) => {
    try {
        const sql = `
            SELECT 
                p.ad AS produit, 
                COUNT(r.id) AS nombre_retours
            FROM urunler p
            LEFT JOIN satislar s ON p.id = s.urun_id
            LEFT JOIN retours r ON s.id = r.satis_id
            GROUP BY p.ad
        `;
        const [results] = await db.query(sql);
        res.json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des retours de produits :', err);
        next(err);
    }
};

const getReport = async (req, res, next) => {
    try {
        const [chiffreAffaires] = await db.query(`
            SELECT SUM(satislar.adet * urunler.fiyat) AS total_ventes
            FROM satislar
            JOIN urunler ON satislar.urun_id = urunler.id
        `);

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

        const [ventesParMois] = await db.query(`
            SELECT 
                MONTH(satislar.tarih) AS mois,
                SUM(satislar.adet * urunler.fiyat) AS total_ventes
            FROM satislar
            JOIN urunler ON satislar.urun_id = urunler.id
            GROUP BY MONTH(satislar.tarih)
            ORDER BY mois ASC
        `);

        const rapport = {
            chiffreAffairesTotal: chiffreAffaires[0]?.total_ventes || 0,
            meilleursProduits,
            meilleursClients,
            ventesParMois,
        };

        res.status(200).json(rapport);
    } catch (err) {
        console.error('Erreur lors de la génération du rapport :', err);
        next(err);
    }
};

const getForecast = async (req, res, next) => {
    let connection;

    try {
        connection = await db.getConnection();

        const [results] = await connection.execute(
            'SELECT date_mouvement AS date, quantite AS price FROM inventaire WHERE type = "Satış" ORDER BY date_mouvement'
        );

        if (!results.length) {
            return res.status(404).json({ message: 'Aucune donnée disponible pour les prévisions.' });
        }

        const dates = results.map(row => new Date(row.date).getTime());
        const prices = results.map(row => row.price);

        const regression = (x, y) => {
            const n = x.length;
            const meanX = x.reduce((sum, xi) => sum + xi, 0) / n;
            const meanY = y.reduce((sum, yi) => sum + yi, 0) / n;
            const slope = x.reduce((acc, xi, i) => acc + (xi - meanX) * (y[i] - meanY), 0) /
                          x.reduce((acc, xi) => acc + Math.pow(xi - meanX, 2), 0);
            const intercept = meanY - slope * meanX;
            return xi => slope * xi + intercept;
        };

        const predict = regression(dates, prices);
        const predictions = dates.map(d => Math.round(predict(d)));

        res.json({ predictions, dates: results.map(row => row.date) });
    } catch (err) {
        console.error('Erreur lors des prévisions :', err);
        next(err);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

module.exports = {
    registerUser,
    loginUser,
    getProducts,
    getCustomers,
    getDashboardStats,
    getBarChartData,
    getAreaChartData,
    getPurchases,
    getDiscountedProducts,
    getRevenue,
    getPopularProducts,
    getBestCustomers,
    getCurrentStock,
    getCriticalStock,
    getPopularInventoryProducts,
    getSalesReturns,
    getClients,
    createPurchaseOrder,
    getPurchaseOrders,
    getProductReturns,
    getReport,
    getForecast
};