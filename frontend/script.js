const API_URL = 'http://localhost:5000/api';
let userId = localStorage.getItem('userId');

// --- 1. CONFIGURATION & SETUP ---

// Update Categories to match your Database
const categories = {
    expense: [
        { id: 3, name: 'Food' },
        { id: 4, name: 'Rent' },
        { id: 5, name: 'Entertainment' },
        { id: 7, name: 'Transport' }
    ],
    income: [
        { id: 1, name: 'Salary' },
        { id: 2, name: 'Freelance' },
        { id: 8, name: 'Bonus' },             // Matches DB
        { id: 9, name: 'Investment Returns' }, // Matches DB
        { id: 10, name: 'Gifts' },             // Matches DB
        { id: 11, name: 'Rental Income' }      // Matches DB
    ]
};

// Check Login Status
if (userId) {
    showDashboard();
}

// FEATURE: Prevent Future Dates (Set 'max' attribute to Today)
const today = new Date().toISOString().split('T')[0];
document.getElementById('t-date').setAttribute('max', today);

// --- 2. AUTHENTICATION LOGIC ---

function toggleAuth() {
    const login = document.getElementById('login-form').parentElement;
    const reg = document.getElementById('register-card');
    if (login.style.display === 'none') {
        login.style.display = 'block';
        reg.style.display = 'none';
    } else {
        login.style.display = 'none';
        reg.style.display = 'block';
    }
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            alert("Registration Successful! Please Login.");
            toggleAuth();
        } else {
            alert(data.error);
        }
    } catch (error) { alert("Error: " + error.message); }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            userId = data.user.id;
            showDashboard();
        } else {
            alert(data.error);
        }
    } catch (error) { alert("Error: " + error.message); }
});

function logout() {
    localStorage.clear();
    location.reload();
}

// --- 3. DASHBOARD LOGIC ---

function showDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    
    // Initialize functionalities
    updateCategoryDropdown(); // Load correct categories (Income/Expense)
    loadDashboardData();
}

// Dynamic Category Dropdown (This enables Bonus, Rental Income, etc.)
document.getElementById('t-type').addEventListener('change', updateCategoryDropdown);

function updateCategoryDropdown() {
    const type = document.getElementById('t-type').value; // 'income' or 'expense'
    const categorySelect = document.getElementById('t-category');
    categorySelect.innerHTML = ''; // Clear old options

    categories[type].forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });
}

// --- 4. STRICT TRANSACTION LOGIC (The "Stop" Feature) ---

document.getElementById('transaction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('t-amount').value);
    const categoryId = parseInt(document.getElementById('t-category').value);
    // Get text name of category for the alert message
    const categoryName = document.getElementById('t-category').options[document.getElementById('t-category').selectedIndex].text;
    const type = document.getElementById('t-type').value;
    const description = document.getElementById('t-desc').value;
    const date = document.getElementById('t-date').value;

    // A. Prevent Negative Numbers (JS Double Check)
    if (amount <= 0) {
        alert("Amount must be a positive number.");
        return;
    }

    // B. Strict Budget Check (Only for Expenses)
    if (type === 'expense') {
        try {
            // Fetch current budget status to check limits
            const res = await fetch(`${API_URL}/budgets/status/${userId}`);
            const budgets = await res.json();
            
            // Find the budget for this specific category
            const myBudget = budgets.find(b => b.name === categoryName);

            if (myBudget) {
                const currentSpent = parseFloat(myBudget.spent);
                const limit = parseFloat(myBudget.amount_limit);
                
                // FEATURE: BLOCK TRANSACTION IF OVER LIMIT
                if (currentSpent + amount > limit) {
                    const remaining = limit - currentSpent;
                    alert(`🚫 TRANSACTION BLOCKED!\n\nYou have set a limit of ₹${limit} for ${categoryName}.\nYou have already spent ₹${currentSpent}.\nYou only have ₹${remaining.toFixed(2)} remaining.`);
                    return; // <--- THIS STOPS THE SAVE PROCESS
                }
            }
        } catch (err) {
            console.error("Budget check failed", err);
        }
    }

    // C. Save to Backend (Only if budget check passed)

    // C. Save to Backend
    const isRecurring = document.getElementById('is-recurring').checked;
    const frequency = document.getElementById('recur-freq').value;

    const transaction = { 
        userId, categoryId, amount, description, date,
        isRecurring, frequency // <--- Include new fields
    };

    const res = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
    });

    if (res.ok) {
        alert('Transaction Added Successfully!');
        document.getElementById('transaction-form').reset();
        document.getElementById('recur-options').style.display = 'none'; // Hide recur options
        
        document.getElementById('t-date').setAttribute('max', today);
        updateCategoryDropdown(); 
        loadDashboardData();
    }
    // const transaction = { userId, categoryId, amount, description, date };

    // const res = await fetch(`${API_URL}/transactions`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(transaction)
    // });

    // if (res.ok) {
    //     alert('Transaction Added Successfully!');
    //     document.getElementById('transaction-form').reset();
        
    //     // Reset date max and dropdowns after form reset
    //     document.getElementById('t-date').setAttribute('max', today);
    //     updateCategoryDropdown(); 
        
    //     loadDashboardData();
    // }
});

// --- 5. BUDGET LOGIC ---

function toggleBudgetForm() {
    const form = document.getElementById('budget-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

document.getElementById('budget-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const categoryId = document.getElementById('b-category').value;
    const amount = document.getElementById('b-amount').value;
    
    // Negative Check
    if (amount <= 0) {
        alert("Budget limit must be positive.");
        return;
    }

    const date = new Date();

    const res = await fetch(`${API_URL}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userId, categoryId, amount, 
            month: date.getMonth() + 1, 
            year: date.getFullYear() 
        })
    });

    if (res.ok) {
        alert("Budget Set Successfully!");
        toggleBudgetForm();
        loadDashboardData();
    } else {
        const data = await res.json();
        alert("Error: " + data.error);
    }
});

// --- 6. LOAD DATA & FILTER ---

async function loadDashboardData() {
    // History
    const historyRes = await fetch(`${API_URL}/transactions?userId=${userId}`);
    const historyData = await historyRes.json();
     renderChart(historyData);

    const tableBody = document.getElementById('history-list');
    tableBody.innerHTML = '';
    
    historyData.forEach(tx => {
        const row = `<tr>
            <td>${tx.transaction_date.split('T')[0]}</td>
            <td>${tx.description}</td>
            <td>${tx.category_name}</td>
            <td style="color:${tx.type === 'expense' ? '#e53e3e' : '#38a169'}; font-weight:bold;">
                ${tx.type === 'expense' ? '-' : '+'}₹${tx.amount}
            </td>
            <td>
            <button onclick="deleteTransaction(${tx.id})" style="background:none; border:none; cursor:pointer;">
                🗑️
            </button>
        </td>
        </tr>`;
        tableBody.innerHTML += row;
    });

    // Budgets
    const budgetRes = await fetch(`${API_URL}/budgets/status/${userId}`);
    const budgetData = await budgetRes.json();
    const budgetContainer = document.getElementById('budget-container');
    budgetContainer.innerHTML = '';

    if(budgetData.length === 0) {
        budgetContainer.innerHTML = '<p style="color:white; opacity:0.8;">No budgets set for this month.</p>';
    }

    budgetData.forEach(b => {
        const percent = Math.min((b.spent / b.amount_limit) * 100, 100);
        // Turn RED if over budget
// Convert strings to numbers using parseFloat()
const color = parseFloat(b.spent) > parseFloat(b.amount_limit) ? '#e53e3e' : '#48bb78';        
        const html = `
            <div style="margin-bottom:15px; color:white;">
                <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:5px;">
                    <strong>${b.name}</strong>
                    <span>₹${b.spent} / ₹${b.amount_limit}</span>
                </div>
                <div class="progress-bg">
                    <div class="progress-fill" style="width:${percent}%; background-color:${color};"></div>
                </div>
            </div>`;
        budgetContainer.innerHTML += html;
    });
    
    // Refresh search filter
    filterTransactions();
}


function filterTransactions() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const type = document.getElementById('filter-type').value;
    const rows = document.querySelectorAll('#history-list tr');

    rows.forEach(row => {
        const desc = row.children[1].textContent.toLowerCase();
        const amountText = row.children[3].textContent;
        const isExpense = amountText.includes('-');
        
        const matchesSearch = desc.includes(search);
        let matchesType = true;
        if (type === 'expense' && !isExpense) matchesType = false;
        if (type === 'income' && isExpense) matchesType = false;

        row.style.display = (matchesSearch && matchesType) ? '' : 'none';
    });
}

// Toggle Recurring Options visibility
function toggleRecurOptions() {
    const isChecked = document.getElementById('is-recurring').checked;
    document.getElementById('recur-options').style.display = isChecked ? 'block' : 'none';
}

// --- 7. CHART VISUALIZATION ---
let overviewChart = null;

function renderChart(transactions) {
    const ctx = document.getElementById('overviewChart').getContext('2d');

    // 1. Calculate Totals
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(tx => {
        if (tx.type === 'income') totalIncome += parseFloat(tx.amount);
        else totalExpense += parseFloat(tx.amount);
    });

    // 2. Destroy old chart if exists
    if (overviewChart) overviewChart.destroy();

    // 3. Draw New Chart
    overviewChart = new Chart(ctx, {
        type: 'doughnut', 
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                data: [totalIncome, totalExpense],
                backgroundColor: ['#48bb78', '#e53e3e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: 'Poppins' } } }
            }
        }
    });
}

// --- 8. DELETE TRANSACTION ---
async function deleteTransaction(id) {
    if(!confirm("Are you sure you want to delete this?")) return;

    try {
        const res = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            // Reloading automatically fixes the Budget Bars and Charts!
            loadDashboardData(); 
        } else {
            alert("Failed to delete");
        }
    } catch (err) {
        console.error(err);
    }
}