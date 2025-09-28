function displayOutput(data) {
    const output = document.getElementById('output');
    if (Array.isArray(data)) {
        const table = document.createElement('table');
        table.className = 'data-table';

        // Creare header
        if (data.length > 0) {
            const headerRow = document.createElement('tr');
            Object.keys(data[0]).forEach(key => {
                const th = document.createElement('th');
                th.textContent = key;
                headerRow.appendChild(th);
            });
            table.appendChild(headerRow);
        }

        data.forEach(row => {
            const tr = document.createElement('tr');
            Object.values(row).forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        output.innerHTML = '';
        output.appendChild(table);
    } else {
        const formattedOutput = typeof data === 'object'
            ? JSON.stringify(data, null, 2)
            : data.toString();
        output.innerHTML = `<pre>${formattedOutput}</pre>`;
    }
}

async function listTable() {
    const tableName = prompt('Introduceți numele tabelului:');

    if (!tableName) {
        showError('Numele tabelului este obligatoriu!');
        return;
    }

    try {
        const response = await fetch('/list-table-simple', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableName }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        displayOutput(data.data);
    } catch (error) {
        showError('Eroare la listarea tabelului: ' + error.message);
    }
}

async function listSortedTable() {
    const tableName = prompt('Introduceți numele tabelului:');
    const sortColumn = prompt('Introduceți coloana pentru sortare:');
    const sortOrder = prompt('Introduceți ordinea (ASC/DESC):').toUpperCase();

    if (!tableName || !sortColumn || !sortOrder) {
        showError('Toate câmpurile sunt obligatorii!');
        return;
    }

    try {
        const response = await fetch('/list-sort-table', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableName, sortColumn, sortOrder }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        displayOutput(data);
    } catch (error) {
        showError('Eroare la listarea tabelului sortat: ' + error.message);
    }
}

async function deleteRecord() {
    const tableName = prompt('Introduceți numele tabelului:');
    const primaryKeyColumn = prompt('Introduceți numele coloanei cheie primare:');
    const primaryKeyValue = prompt('Introduceți valoarea cheii primare:');

    if (!tableName || !primaryKeyColumn || !primaryKeyValue) {
        showError('Toate câmpurile sunt obligatorii!');
        return;
    }

    const validTables = ['UTILIZATOR', 'MELODIE', 'ALBUM', 'ALBUM_PERSONALIZAT', 'ARTIST', 'ABONAMENT', 'GEN', 'CASA_DE_DISCURI'];
    if (!validTables.includes(tableName.toUpperCase())) {
        showError('Numele tabelului nu este valid!');
        return;
    }

    try {
        const response = await fetch('/delete-with-cascade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tableName,
                primaryKeyColumn,
                primaryKeyValue
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 400) {
                showError('Date incomplete trimise către server.');
            } else if (response.status === 404) {
                showError('Înregistrarea specificată nu a fost găsită.');
            } else {
                showError(`Eroare la ștergerea înregistrării: ${data.error || 'Eroare necunoscută.'}`);
            }
            return;
        }

        if (data.success) {
            showSuccess(`Înregistrare ștearsă cu succes! ${data.rowsAffected} înregistrări au fost șterse în cascadă.`);
            displayOutput(data);
        } else {
            showError(`Eroare la ștergerea înregistrării: ${data.error || 'Eroare necunoscută.'}`);
        }
    } catch (error) {
        showError('Eroare la ștergerea înregistrării: ' + error.message);
    }
}

async function updateRecord() {
    const tableName = prompt('Introduceți numele tabelului:');
    const idColumn = prompt('Introduceți coloana ID:');
    const idValue = prompt('Introduceți valoarea ID-ului:');
    const columnToUpdate = prompt('Introduceți numele coloanei de modificat:');
    const newValue = prompt('Introduceți noua valoare:');

    if (!tableName || !idColumn || !idValue || !columnToUpdate || newValue === null) {
        showError('Toate câmpurile sunt obligatorii!');
        return;
    }

    try {
        const response = await fetch('/update-record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableName, idColumn, idValue, columnToUpdate, newValue }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        displayOutput(data);
        showSuccess('Înregistrare actualizată cu succes!');
    } catch (error) {
        showError('Eroare la actualizarea înregistrării: ' + error.message);
    }
}

async function complexQuery() {
    try {
        const response = await fetch('/complex-query');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        displayOutput(data);
        showSuccess('Interogare complexă executată cu succes!');
    } catch (error) {
        showError('Eroare la executarea interogării complexe: ' + error.message);
    }
}

async function artistStatistics() {
    try {
        const response = await fetch('/artist-statistics');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        displayOutput(data);
        showSuccess('Statistici generate cu succes!');
    } catch (error) {
        showError('Eroare la generarea statisticilor: ' + error.message);
    }
}

async function melodiiRecente() {
    try {
        const response = await fetch('/melodii-recente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        displayOutput(data);
        showSuccess('Melodii recente afișate cu succes!');
    } catch (error) {
        showError('Eroare la accesarea melodiilor recente: ' + error.message);
    }
}

async function statisticiGen() {
    try {
        const response = await fetch('/statistici-gen');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        displayOutput(data);
        showSuccess('Statistici pe genuri generate cu succes!');
    } catch (error) {
        showError('Eroare la accesarea statisticilor pe genuri: ' + error.message);
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.textContent = message;
    document.getElementById('alerts').appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.textContent = message;
    document.getElementById('alerts').appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 5000);
}