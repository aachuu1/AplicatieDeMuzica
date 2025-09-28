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

async function initializeDatabase() {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const constraintsToRemove = ['fk_melodie_album', 'SYS_C009631'];
        for (const constraint of constraintsToRemove) {
            const checkConstraint = `
                SELECT COUNT(*) AS exists_constraint
                FROM user_constraints
                WHERE constraint_name = :constraint_name
            `;
            const checkResult = await connection.execute(checkConstraint, {
                constraint_name: constraint.toUpperCase(),
            });

            if (checkResult.rows[0].EXISTS_CONSTRAINT > 0) {
                await connection.execute(`
                    ALTER TABLE MELODIE DROP CONSTRAINT ${constraint}
                `);
                console.log(`Constrângerea ${constraint} eliminată cu succes.`);
            } else {
                console.log(`Constrângerea ${constraint} nu există.`);
            }
        }

        const checkConstraint = `
            SELECT COUNT(*) AS exists_constraint
            FROM user_constraints
            WHERE constraint_name = 'FK_MELODIE_ALBUM'
        `;
        const checkResult = await connection.execute(checkConstraint);

        if (checkResult.rows[0].EXISTS_CONSTRAINT === 0) {
            await connection.execute(`
                ALTER TABLE MELODIE
                ADD CONSTRAINT fk_melodie_album
                    FOREIGN KEY (id_album)
                    REFERENCES ALBUM(id_album)
                    ON DELETE CASCADE
            `);
            console.log('Constrângerea fk_melodie_album adăugată cu succes.');
        } else {
            console.log('Constrângerea fk_melodie_album există deja.');
        }

        await connection.commit();
        console.log('Baza de date inițializată cu succes');
    } catch (err) {
        console.error('Eroare la inițializarea bazei de date:', err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeErr) {
                console.error('Eroare la închiderea conexiunii:', closeErr);
            }
        }
    }
}

app.post('/list-table-simple', async (req, res) => {
    const { tableName } = req.body;
    if (!tableName) {
        return res.status(400).json({ error: 'Numele tabelului este obligatoriu' });
    }
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        const sql = `SELECT * FROM ${sanitizedTableName}`;

        const result = await connection.execute(sql, [], {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeErr) {
                console.error('Eroare la închiderea conexiunii:', closeErr);
            }
        }
    }
});

app.post('/list-sort-table', async (req, res) => {
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
app.post('/update-record', async (req, res) => {
    const { tableName, idColumn, idValue, columnToUpdate, newValue } = req.body;
    if (!tableName || !idColumn || !idValue || !columnToUpdate || newValue === undefined) {
        return res.status(400).json({ error: 'Datele sunt incomplete sau invalide' });
    }

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `UPDATE ${tableName} SET ${columnToUpdate} = :newValue WHERE ${idColumn} = :idValue`;
        const result = await connection.execute(sql, { newValue, idValue });
        await connection.commit();
        res.json({ rowsAffected: result.rowsAffected });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});


app.post('/delete-with-cascade', async (req, res) => {
    const { tableName, primaryKeyColumn, primaryKeyValue } = req.body;

    if (!tableName || !primaryKeyColumn || !primaryKeyValue) {
        return res.status(400).json({
            success: false,
            error: 'Date incomplete. Sunt necesare: tableName, primaryKeyColumn și primaryKeyValue'
        });
    }

    let connection;
    try {
        const validTables = ['UTILIZATOR', 'MELODIE', 'ALBUM', 'ALBUM_PERSONALIZAT', 'ARTIST', 'ABONAMENT', 'GEN', 'CASA_DE_DISCURI'];
        const sanitizedTableName = tableName.toUpperCase();

        if (!validTables.includes(sanitizedTableName)) {
            return res.status(400).json({
                success: false,
                error: 'Numele tabelului nu este valid'
            });
        }

        connection = await oracledb.getConnection(dbConfig);

        const checkQuery = `
            SELECT COUNT(*) as count
            FROM ${sanitizedTableName}
            WHERE ${primaryKeyColumn} = :primaryKeyValue
        `;

        const checkResult = await connection.execute(
            checkQuery,
            { primaryKeyValue },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (checkResult.rows[0].COUNT === 0) {
            return res.status(404).json({
                success: false,
                error: 'Înregistrarea nu a fost găsită'
            });
        }

        async function deleteCascade(table, column, value) {
            const deleteOrder = {
                'UTILIZATOR': [
                    { table: 'UTILIZATOR_MELODIE', column: 'utilizator_id' },
                    { table: 'ALBUM_PERSONALIZAT_UTILIZATOR', column: 'utilizator_id' },
                    { table: 'ALBUM_PERSONALIZAT', column: 'utilizator_id' }
                ],
                'MELODIE': [
                    { table: 'UTILIZATOR_MELODIE', column: 'id_melodie' }
                ],
                'ALBUM': [
                    { table: 'MELODIE', column: 'id_album' }
                ],
                'ALBUM_PERSONALIZAT': [
                    { table: 'ALBUM_PERSONALIZAT_UTILIZATOR', column: 'id_album_personalizat' }
                ],
                'ARTIST': [
                    { table: 'MELODIE', column: 'id_artist' },
                    { table: 'ALBUM', column: 'id_artist' }
                ],
                'ABONAMENT': [
                    { table: 'UTILIZATOR', column: 'id_abonament' }
                ],
                'CASA_DE_DISCURI': [
                    { table: 'ARTIST', column: 'nume_casa' }
                ],
                'GEN': [
                    { table: 'ALBUM', column: 'nume_gen' }
                ]
            };

            const dependentTables = deleteOrder[table] || [];

            for (const depTable of dependentTables) {
                const checkDepQuery = `
                    SELECT COUNT(*) as count
                    FROM ${depTable.table}
                    WHERE ${depTable.column} = :value
                `;

                const checkResult = await connection.execute(
                    checkDepQuery,
                    { value },
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                );

                if (checkResult.rows[0].COUNT > 0) {

                    await deleteCascade(depTable.table, depTable.column, value);
                }
            }

            const deleteQuery = `
                DELETE FROM ${table}
                WHERE ${column} = :value
            `;

            const result = await connection.execute(
                deleteQuery,
                { value },
                { autoCommit: false }
            );

            return result.rowsAffected;
        }

        const rowsAffected = await deleteCascade(sanitizedTableName, primaryKeyColumn, primaryKeyValue);
        await connection.commit();

        res.json({
            success: true,
            message: 'Ștergere realizată cu succes',
            rowsAffected
        });

    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackErr) {
                console.error('Eroare la rollback:', rollbackErr);
            }
        }

        res.status(500).json({
            success: false,
            error: `Eroare la ștergerea înregistrării: ${err.message}`
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeErr) {
                console.error('Eroare la închiderea conexiunii:', closeErr);
            }
        }
    }
});

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

app.get('/artist-statistics', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `
            SELECT a.nume AS artist,
                   cd.nume_casa AS nume_casa,
                   COUNT(m.id_melodie) AS total_melodii,
                   AVG(m.durata) AS durata_medie,
                   COUNT(DISTINCT al.id_album) AS total_albume
            FROM ARTIST a
                     JOIN CASA_DE_DISCURI cd ON a.nume_casa = cd.nume_casa
                     JOIN MELODIE m ON m.id_artist = a.id_artist
                     JOIN ALBUM al ON m.id_album = al.id_album
            GROUP BY a.nume, cd.nume_casa
            HAVING COUNT(m.id_melodie) > 1
               AND AVG(NVL(m.durata, 0)) > 180
        `;

        const result = await connection.execute(sql);

        res.json(result.rows);
    } catch (err) {
        console.error('Eroare la accesarea statisticilor:', err);
        res.status(500).json({ error: 'Eroare la accesarea statisticilor.' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeErr) {
                console.error('Eroare la închiderea conexiunii:', closeErr);
            }
        }
    }
});

app.post('/melodii-recente', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `
            SELECT m.id_melodie, m.titlu, m.durata, m.data_lansare,
                   a.nume as artist_nume, al.titlu as album_titlu
            FROM MELODIE m
                     JOIN ARTIST a ON m.id_artist = a.id_artist
                     JOIN ALBUM al ON m.id_album = al.id_album
            WHERE m.data_lansare <= SYSDATE
            ORDER BY m.data_lansare DESC
        `;
        const result = await connection.execute(sql);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

app.get('/statistici-gen', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `
            WITH casa_populara AS (
                SELECT al.nume_gen,
                       cd.nume_casa,
                       COUNT(*) AS numar_melodii
                FROM ARTIST a
                         JOIN MELODIE m ON m.id_artist = a.id_artist
                         JOIN ALBUM al ON m.id_album = al.id_album
                         JOIN CASA_DE_DISCURI cd ON a.nume_casa = cd.nume_casa
                GROUP BY al.nume_gen, cd.nume_casa
            ),
                 casa_max AS (
                     SELECT nume_gen,
                            nume_casa
                     FROM casa_populara cp1
                     WHERE numar_melodii = (
                         SELECT MAX(numar_melodii)
                         FROM casa_populara cp2
                         WHERE cp1.nume_gen = cp2.nume_gen
                     )
                 )
            SELECT g.nume_gen,
                   COUNT(DISTINCT m.id_melodie) AS total_melodii,
                   COUNT(DISTINCT al.id_album) AS total_albume,
                   COUNT(DISTINCT a.id_artist) AS total_artisti,
                   AVG(m.durata) AS durata_medie,
                   cm.nume_casa AS casa_discuri_populara
            FROM GEN g
                     LEFT JOIN ALBUM al ON g.nume_gen = al.nume_gen
                     LEFT JOIN MELODIE m ON m.id_album = al.id_album
                     LEFT JOIN ARTIST a ON m.id_artist = a.id_artist
                     LEFT JOIN casa_max cm ON g.nume_gen = cm.nume_gen
            GROUP BY g.nume_gen, cm.nume_casa
            ORDER BY COUNT(DISTINCT m.id_melodie) DESC
        `;

        const result = await connection.execute(sql);
        res.json(result.rows);
    } catch (err) {
        console.error('Eroare la accesarea statisticilor:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Serverul rulează la http://localhost:${PORT}`);
    });
});