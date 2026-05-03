const API = "http://localhost:5001/api";
const categories = ["Food", "Travel", "Shopping", "Education", "Rent", "Health", "Entertainment", "Salary", "Scholarship", "Other"];

let transactions = [];
let barChart;
let pieChart;

const form = document.getElementById("expenseForm");
const list = document.getElementById("transactionList");
const message = document.getElementById("message");

function fillCategories() {
  const options = categories.map((cat) => `<option value="${cat}">${cat}</option>`).join("");
  document.getElementById("category").innerHTML = options;
  document.getElementById("filterCategory").innerHTML = `<option value="all">All Categories</option>${options}`;
}

function money(amount) {
  return "₹" + amount;
}

async function api(path, method = "GET", data) {
  const settings = {
    method,
    headers: { "Content-Type": "application/json" }
  };

  if (data) {
    settings.body = JSON.stringify(data);
  }

  const response = await fetch(API + path, settings);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }

  return result;
}

function getFormData() {
  return {
    title: document.getElementById("title").value,
    amount: document.getElementById("amount").value,
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
    date: document.getElementById("date").value,
    note: document.getElementById("note").value
  };
}

function clearForm() {
  form.reset();
  document.getElementById("editId").value = "";
  document.getElementById("formHeading").innerText = "Add Transaction";
  document.getElementById("date").valueAsDate = new Date();
  message.innerText = "";
}

async function loadTransactions() {
  let url = "/transactions?";
  url += "search=" + document.getElementById("search").value;
  url += "&type=" + document.getElementById("filterType").value;
  url += "&category=" + document.getElementById("filterCategory").value;

  const data = await api(url);
  const summary = await api("/transactions/summary?" + url.split("?")[1]);

  transactions = data.transactions;
  showTransactions();
  showSummary(summary);
  showCharts(summary);
}

function showTransactions() {
  list.innerHTML = "";

  transactions.forEach((item) => {
    list.innerHTML += `
      <tr>
        <td>${item.date}</td>
        <td>${item.title}</td>
        <td>${item.category}</td>
        <td>${item.type}</td>
        <td class="${item.type}">${money(item.amount)}</td>
        <td>
          <button onclick="editTransaction('${item._id}')">Edit</button>
          <button onclick="deleteTransaction('${item._id}')">Delete</button>
        </td>
      </tr>
    `;
  });
}

function showSummary(summary) {
  document.getElementById("income").innerText = money(summary.totalIncome);
  document.getElementById("expenses").innerText = money(summary.totalExpenses);
  document.getElementById("balance").innerText = money(summary.balance);
  document.getElementById("topCategory").innerText = summary.insights.highestSpendingCategory.category;
  document.getElementById("trend").innerText = summary.insights.spendingTrend;
}

function showCharts(summary) {
  if (barChart) barChart.destroy();
  if (pieChart) pieChart.destroy();

  barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: summary.monthlySeries.map((month) => month.month),
      datasets: [
        { label: "Income", data: summary.monthlySeries.map((month) => month.income), backgroundColor: "green" },
        { label: "Expense", data: summary.monthlySeries.map((month) => month.expenses), backgroundColor: "crimson" }
      ]
    }
  });

  pieChart = new Chart(document.getElementById("pieChart"), {
    type: "pie",
    data: {
      labels: Object.keys(summary.categoryTotals),
      datasets: [{ data: Object.values(summary.categoryTotals), backgroundColor: ["#1f4e79", "#2e8b57", "#dc143c", "#f39c12", "#8e44ad"] }]
    }
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.getElementById("editId").value;
  const data = getFormData();

  try {
    if (id) {
      await api("/transactions/" + id, "PUT", data);
    } else {
      await api("/transactions", "POST", data);
    }

    clearForm();
    loadTransactions();
  } catch (error) {
    message.innerText = error.message;
  }
});

function editTransaction(id) {
  const item = transactions.find((transaction) => transaction._id === id);

  document.getElementById("editId").value = item._id;
  document.getElementById("title").value = item.title;
  document.getElementById("amount").value = item.amount;
  document.getElementById("type").value = item.type;
  document.getElementById("category").value = item.category;
  document.getElementById("date").value = item.date;
  document.getElementById("note").value = item.note;
  document.getElementById("formHeading").innerText = "Edit Transaction";
}

async function deleteTransaction(id) {
  if (confirm("Delete this transaction?")) {
    await api("/transactions/" + id, "DELETE");
    loadTransactions();
  }
}

document.getElementById("filterBtn").addEventListener("click", loadTransactions);
document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("search").value = "";
  document.getElementById("filterType").value = "all";
  document.getElementById("filterCategory").value = "all";
  loadTransactions();
});
document.getElementById("clearBtn").addEventListener("click", clearForm);

fillCategories();
clearForm();
loadTransactions();
