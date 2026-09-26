import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import "./App.css";

const CATEGORIES = [
  { name: "Food", color: "#e0663d", icon: "🍔" },
  { name: "Transport", color: "#3d7ea6", icon: "🚗" },
  { name: "Shopping", color: "#b3548e", icon: "🛍️" },
  { name: "Entertainment", color: "#7c5cbf", icon: "🎬" },
  { name: "Other", color: "#8a8677", icon: "📦" },
];

const CATEGORY_MAP = CATEGORIES.reduce((map, c) => {
  map[c.name] = c;
  return map;
}, {});

// Smoothly animates a number from its previous value to a new one.
function useCountUp(value, duration = 650) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const start = prevRef.current;
    const change = value - start;

    if (change === 0) {
      setDisplay(value);
      return;
    }

    const startTime = performance.now();
    let raf;

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + change * eased));

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevRef.current = value;
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}

function App() {
  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [toast, setToast] = useState(null);

  const titleInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  // Focus the title input when the app loads
  useEffect(() => {
    titleInputRef.current.focus();
  }, []);

  // Load saved expenses, or fall back to a sample fetch
  useEffect(() => {
    const savedExpenses = localStorage.getItem("expenses");

    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
      setLoading(false);
      return;
    }

    const fetchExpenses = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "https://jsonplaceholder.typicode.com/posts?_limit=5"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch expenses");
        }

        const data = await response.json();

        const formattedExpenses = data.map((item) => ({
          id: item.id,
          title: item.title.slice(0, 20),
          amount: item.id * 100,
          category: "Other",
        }));

        setExpenses(formattedExpenses);
      } catch (err) {
        setError("Unable to load expenses. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, []);

  useEffect(() => {
    if (expenses.length > 0) {
      localStorage.setItem("expenses", JSON.stringify(expenses));
    }
  }, [expenses]);

  // Clean up any pending toast timer on unmount
  useEffect(() => {
    return () => clearTimeout(toastTimerRef.current);
  }, []);

  const showUndoToast = useCallback((deletedExpense) => {
    clearTimeout(toastTimerRef.current);
    setToast(deletedExpense);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
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

      setExpenses((prevExpenses) => [...prevExpenses, newExpense]);

      setTitle("");
      setAmount("");
      setCategory("Food");

      titleInputRef.current.focus();
    },
    [title, amount, category]
  );

  // Delete expense, with a short fade-out then an undo toast
  const deleteExpense = useCallback(
    (id) => {
      setRemovingId(id);

      setTimeout(() => {
        setExpenses((prevExpenses) => {
          const target = prevExpenses.find((expense) => expense.id === id);
          if (target) showUndoToast(target);
          return prevExpenses.filter((expense) => expense.id !== id);
        });
        setRemovingId(null);
      }, 260);
    },
    [showUndoToast]
  );

  const undoDelete = useCallback(() => {
    if (!toast) return;
    setExpenses((prev) => [...prev, toast]);
    clearTimeout(toastTimerRef.current);
    setToast(null);
  }, [toast]);

  const clearAll = useCallback(() => {
    if (expenses.length === 0) return;
    if (window.confirm("Clear every expense? This can't be undone.")) {
      setExpenses([]);
      localStorage.removeItem("expenses");
    }
  }, [expenses.length]);

  // Calculate total using useMemo
  const totalExpense = useMemo(() => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  }, [expenses]);

  const highestExpense = useMemo(() => {
    return expenses.length > 0
      ? Math.max(...expenses.map((expense) => expense.amount))
      : 0;
  }, [expenses]);

  const averageExpense = useMemo(() => {
    return expenses.length > 0 ? Math.round(totalExpense / expenses.length) : 0;
  }, [expenses.length, totalExpense]);

  // Spend per category, used for the donut chart and legend
  const categoryBreakdown = useMemo(() => {
    const totals = {};
    expenses.forEach((expense) => {
      totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
    });

    return CATEGORIES.map((cat) => ({
      ...cat,
      amount: totals[cat.name] || 0,
      percent: totalExpense > 0 ? Math.round(((totals[cat.name] || 0) / totalExpense) * 100) : 0,
    })).filter((cat) => cat.amount > 0);
  }, [expenses, totalExpense]);

  const donutGradient = useMemo(() => {
    if (totalExpense === 0) return "#e2e8f0";
    let cumulative = 0;
    const stops = categoryBreakdown.map((cat) => {
      const start = cumulative;
      cumulative += (cat.amount / totalExpense) * 360;
      return `${cat.color} ${start}deg ${cumulative}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [categoryBreakdown, totalExpense]);

  const toggleCategoryFilter = useCallback((name) => {
    setFilterCategory((prev) => (prev === name ? "All" : name));
  }, []);

  const filteredExpenses = useMemo(() => {
    const filtered = expenses.filter((expense) => {
      const matchesSearch = expense.title
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        filterCategory === "All" || expense.category === filterCategory;

      return matchesSearch && matchesCategory;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case "oldest":
        sorted.sort((a, b) => a.id - b.id);
        break;
      case "highest":
        sorted.sort((a, b) => b.amount - a.amount);
        break;
      case "lowest":
        sorted.sort((a, b) => a.amount - b.amount);
        break;
      default:
        sorted.sort((a, b) => b.id - a.id);
    }
    return sorted;
  }, [expenses, search, filterCategory, sortBy]);

  const animatedTotal = useCountUp(totalExpense);
  const animatedCount = useCountUp(expenses.length);
  const animatedAverage = useCountUp(averageExpense);
  const animatedHighest = useCountUp(highestExpense);

  return (
    <div className="app">
      <header>
        <h1>💰 Expense Tracker</h1>
        <p>Track your daily expenses easily</p>
      </header>

      <main>
        <section className="overview">
          <div className="donut-card">
            <div
              className="donut"
              style={{ background: donutGradient }}
              role="img"
              aria-label="Spending breakdown by category"
            >
              <div className="donut-hole">
                <span className="donut-hole-label">Total</span>
                <span className="donut-hole-value">₹{animatedTotal}</span>
              </div>
            </div>

            {categoryBreakdown.length > 0 ? (
              <ul className="legend">
                {categoryBreakdown.map((cat) => (
                  <li key={cat.name}>
                    <button
                      type="button"
                      className={`legend-item ${
                        filterCategory === cat.name ? "active" : ""
                      }`}
                      onClick={() => toggleCategoryFilter(cat.name)}
                    >
                      <span
                        className="legend-dot"
                        style={{ background: cat.color }}
                      />
                      <span className="legend-name">
                        {cat.icon} {cat.name}
                      </span>
                      <span className="legend-value">
                        ₹{cat.amount} · {cat.percent}%
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="legend-empty">
                Add an expense to see your spending breakdown.
              </p>
            )}
          </div>

          <div className="stat-stack">
            <div className="summary-card">
              <h2>Total Records</h2>
              <p>{animatedCount}</p>
            </div>
            <div className="summary-card">
              <h2>Average Expense</h2>
              <p>₹{animatedAverage}</p>
            </div>
            <div className="summary-card">
              <h2>Highest Expense</h2>
              <p>₹{animatedHighest}</p>
            </div>
          </div>
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
              style={{ borderLeft: `4px solid ${CATEGORY_MAP[category].color}` }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>

            <button type="submit">Add Expense</button>
          </form>
        </section>

        <section className="expense-section">
          <div className="expense-section-header">
            <h2>Recent Expenses</h2>
            {expenses.length > 0 && (
              <button type="button" className="clear-all" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>

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
              {CATEGORIES.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest amount</option>
              <option value="lowest">Lowest amount</option>
            </select>
          </div>

          {loading && (
            <div className="skeleton-list">
              {[0, 1, 2].map((i) => (
                <div className="skeleton-card" key={i} />
              ))}
            </div>
          )}

          {error && <p className="error-message">❌ {error}</p>}

          {!loading && filteredExpenses.length === 0 ? (
            <div className="empty">
              <span className="empty-icon">🗒️</span>
              <p>No expenses match here yet.</p>
            </div>
          ) : (
            !loading && (
              <div className="expense-list">
                {filteredExpenses.map((expense) => {
                  const cat = CATEGORY_MAP[expense.category] || CATEGORY_MAP.Other;
                  return (
                    <div
                      className={`expense-card ${
                        removingId === expense.id ? "removing" : ""
                      }`}
                      key={expense.id}
                      style={{ borderLeftColor: cat.color }}
                    >
                      <div>
                        <h3>{expense.title}</h3>
                        <span
                          style={{
                            background: `${cat.color}1a`,
                            color: cat.color,
                          }}
                        >
                          {cat.icon} {expense.category}
                        </span>
                      </div>

                      <div className="expense-right">
                        <strong>₹{expense.amount}</strong>
                        <button onClick={() => deleteExpense(expense.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </section>
      </main>

      {toast && (
        <div className="toast">
          <span>Deleted "{toast.title}"</span>
          <button type="button" onClick={undoDelete}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
