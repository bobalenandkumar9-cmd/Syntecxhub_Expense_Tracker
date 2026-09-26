import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import "./App.css";

function App() {
  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  const titleInputRef = useRef(null);

  // Focus the title input when the app loads
  useEffect(() => {
    titleInputRef.current.focus();
  }, []);

  // Load sample expenses
  useEffect(() => {
  const fetchExpenses = async () => {
    try {
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/posts?_limit=5"
      );

      const data = await response.json();

      const formattedExpenses = data.map((item) => ({
        id: item.id,
        title: item.title.slice(0, 20),
        amount: item.id * 100,
        category: "Other",
      }));

      setExpenses(formattedExpenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };

  fetchExpenses();
}, []);

  // Add expense
  const addExpense = useCallback(
    (e) => {
      e.preventDefault();

      if (!title || !amount) {
        alert("Please enter expense details");
        return;
      }

      const newExpense = {
        id: Date.now(),
        title,
        amount: Number(amount),
        category,
      };

      setExpenses((prevExpenses) => [
        ...prevExpenses,
        newExpense,
      ]);

      setTitle("");
      setAmount("");
      setCategory("Food");

      titleInputRef.current.focus();
    },
    [title, amount, category]
  );

  // Delete expense
  const deleteExpense = useCallback((id) => {
    setExpenses((prevExpenses) =>
      prevExpenses.filter((expense) => expense.id !== id)
    );
  }, []);

  // Calculate total using useMemo
  const totalExpense = useMemo(() => {
    return expenses.reduce(
      (total, expense) => total + expense.amount,
      0
    );
  }, [expenses]);
  const filteredExpenses = useMemo(() => {
  return expenses.filter((expense) => {
    const matchesSearch = expense.title
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      filterCategory === "All" ||
      expense.category === filterCategory;

    return matchesSearch && matchesCategory;
  });
}, [expenses, search, filterCategory]);

  return (
    <div className="app">
      <header>
        <h1>💰 Expense Tracker</h1>
        <p>Track your daily expenses easily</p>
      </header>

      <main>
        <section className="summary">
          <h2>Total Expenses</h2>
          <p>₹{totalExpense}</p>
        </section>

        <section className="form-section">
          <h2>Add Expense</h2>

          <form onSubmit={addExpense}>
            <input
              ref={titleInputRef}
              type="text"
              placeholder="Expense title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Food</option>
              <option>Transport</option>
              <option>Shopping</option>
              <option>Entertainment</option>
              <option>Other</option>
            </select>

            <button type="submit">Add Expense</button>
          </form>
        </section>

        <section className="expense-section">
  <h2>Recent Expenses</h2>

  <div className="filters">
    <input
      type="text"
      placeholder="🔎 Search expenses..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    <select
      value={filterCategory}
      onChange={(e) => setFilterCategory(e.target.value)}
    >
      <option value="All">All Categories</option>
      <option value="Food">Food</option>
      <option value="Transport">Transport</option>
      <option value="Shopping">Shopping</option>
      <option value="Entertainment">Entertainment</option>
      <option value="Other">Other</option>
    </select>
  </div>

          {filteredExpenses.length === 0 ? (
            <p className="empty">No expenses added yet.</p>
          ) : (
            <div className="expense-list">
              {filteredExpenses.map((expense) => (
                <div className="expense-card" key={expense.id}>
                  <div>
                    <h3>{expense.title}</h3>
                    <span>{expense.category}</span>
                  </div>
                  

                  <div className="expense-right">
                    <strong>₹{expense.amount}</strong>

                    <button
                      onClick={() => deleteExpense(expense.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
