import express from 'express';
import oracledb from 'oracledb';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const dbConfig = {
    user: 'utilizator',
    password: 'pandispan',
    connectString: 'localhost:1521/xe'
};

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint pentru listare cu sortare
app.post('/list-table', async (req, res) => {
    const { tableName, sortColumn, sortOrder } = req.body;
    if (!tableName || !sortColumn || !sortOrder) {
        return res.status(400).json({ error: 'Parametrii sunt incompleți' });
    }

    let connection;

    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT * FROM ${tableName} ORDER BY ${sortColumn} ${sortOrder}`;
        const result = await connection.execute(sql);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// Endpoint pentru update
app.post('/update-record', async (req, res) => {
    const { tableName, idColumn, idValue, columnToUpdate, newValue } = req.body;

    // Validare date primite
    if (!tableName || !idColumn || !idValue || !columnToUpdate || newValue === undefined) {
        return res.status(400).json({ error: 'Datele sunt incomplete sau invalide' });
    }

    let connection;

    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `UPDATE ${tableName} SET ${columnToUpdate} = :newValue WHERE ${idColumn} = :idValue`;
        const result = await connection.execute(sql, { newValue, idValue });

        // Commit manual
        await connection.commit();

        res.json({ rowsAffected: result.rowsAffected });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});
// Endpoint pentru ștergere
app.post('/delete-record', async (req, res) => {
    const { tableName, idColumn, idValue } = req.body;

    // Validare date primite
    if (!tableName || !idColumn || idValue === undefined) {
        return res.status(400).json({ error: 'Datele sunt incomplete sau invalide' });
    }

    let connection;

    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `DELETE FROM ${tableName} WHERE ${idColumn} = :idValue`;
        const result = await connection.execute(sql, { idValue });

        // Commit manual
        await connection.commit();

        res.json({ rowsAffected: result.rowsAffected });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});


// Interogare complexă cu 3 tabele și 2 condiții
app.get('/complex-query', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `
            SELECT m.titlu as melodie, a.nume as artist, al.titlu as album,
                   g.nume_gen, cd.nume_casa
            FROM MELODIE m
                     JOIN ARTIST a ON m.id_artist = a.id_artist
                     JOIN ALBUM al ON m.id_album = al.id_album
                     JOIN GEN g ON al.nume_gen = g.nume_gen
                     JOIN CASA_DE_DISCURI cd ON a.nume_casa = cd.nume_casa
            WHERE g.nume_gen = 'Rock'
              AND m.data_lansare <= SYSDATE
        `;
        const result = await connection.execute(sql);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// Interogare cu GROUP BY și HAVING
app.get('/artist-statistics', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `
            SELECT a.nume as artist, cd.nume_casa,
                   COUNT(m.id_melodie) as total_melodii,
                   AVG(m.durata) as durata_medie,
                   COUNT(DISTINCT al.id_album) as total_albume
            FROM ARTIST a
                     JOIN CASA_DE_DISCURI cd ON a.nume_casa = cd.nume_casa
                     JOIN MELODIE m ON m.id_artist = a.id_artist
                     JOIN ALBUM al ON m.id_album = al.id_album
            GROUP BY a.nume, cd.nume_casa
            HAVING COUNT(m.id_melodie) > = 1
               AND AVG(m.durata) > 180
        `;
        const result = await connection.execute(sql);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// Vizualizare compusă - melodii recente
app.get('/view-melodii-recente', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT * FROM MELODIE`;
        const result = await connection.execute(sql);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// Vizualizare complexă - statistici gen
app.get('/view-statistici-gen', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT * FROM GEN`;
        const result = await connection.execute(sql);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

app.listen(PORT, () => {
    console.log(`Serverul rulează la http://localhost:${PORT}`);
});
