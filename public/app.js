function displayOutput(data) {
    const output = document.getElementById('output');

    // Verifică dacă datele sunt un array pentru a le afișa într-un tabel
    if (Array.isArray(data)) {
        const table = document.createElement('table');

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

        // Creare rânduri cu date
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
        output.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
}

async function listTable() {
    const tableName = prompt('Introduceți numele tabelului:');
    const sortColumn = prompt('Introduceți coloana pentru sortare:');
    const sortOrder = prompt('Introduceți ordinea (ASC/DESC):');

    try {
        const response = await fetch('/list-table', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableName, sortColumn, sortOrder }),
        });
        const data = await response.json();
        displayOutput(data);
    } catch (error) {
        showError('Eroare la listarea tabelului: ' + error.message);
    }
}

async function updateRecord() {
    const tableName = prompt('Introduceți numele tabelului:');
    const idColumn = prompt('Introduceți coloana ID:');
    const idValue = prompt('Introduceți valoarea ID-ului:');
    const columnToUpdate = prompt('Introduceți numele coloanei de modificat:');
    const newValue = prompt('Introduceți noua valoare:');

    try {
        const response = await fetch('/update-record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableName, idColumn, idValue, columnToUpdate, newValue }),
        });
        const data = await response.json();
        displayOutput(data);
        showSuccess('Înregistrare actualizată cu succes!');
    } catch (error) {
        showError('Eroare la actualizarea înregistrării: ' + error.message);
    }
}

async function deleteRecord() {
    const tableName = prompt('Introduceți numele tabelului:');
    const idColumn = prompt('Introduceți coloana ID:');
    const idValue = prompt('Introduceți valoarea ID-ului:');

    try {
        const response = await fetch('/delete-record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableName, idColumn, idValue }),
        });
        const data = await response.json();
        displayOutput(data);
        showSuccess('Înregistrare ștearsă cu succes!');
    } catch (error) {
        showError('Eroare la ștergerea înregistrării: ' + error.message);
    }
}

// Funcții noi pentru cerințele adăugate
async function complexQuery() {
    try {
        const response = await fetch('/complex-query');
        const data = await response.json();
        displayOutput(data);
    } catch (error) {
        showError('Eroare la executarea interogării complexe: ' + error.message);
    }
}

async function artistStatistics() {
    try {
        const response = await fetch('/artist-statistics');
        const data = await response.json();
        displayOutput(data);
    } catch (error) {
        showError('Eroare la generarea statisticilor: ' + error.message);
    }
}

async function viewMelodiiRecente() {
    try {
        const response = await fetch('/view-melodii-recente');
        const data = await response.json();
        displayOutput(data);
    } catch (error) {
        showError('Eroare la accesarea vizualizării: ' + error.message);
    }
}

async function viewStatisticiGen() {
    try {
        const response = await fetch('/view-statistici-gen');
        const data = await response.json();
        displayOutput(data);
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