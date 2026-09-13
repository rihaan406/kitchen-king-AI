"use client";

import { useEffect, useState } from "react";

const API = "https://chefkingdom.onrender.com";

const starter = ["Eggs", "Potatoes", "Tomatoes", "Onion"];

const tabs = [
  "Home",
  "AI Chef",
  "Pantry",
  "Recipes",
  "Scanner",
  "Shopping",
  "Nutrition",
  "Voice Chef",
  "Cooking Mode",
  "Profile",
  "Security",
];

function Card({ children }) {
  return <div className="card">{children}</div>;
}

export default function Home() {
  const [tab, setTab] = useState("Home");
  const [ingredients, setIngredients] = useState(starter);
  const [request, setRequest] = useState("");
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [servings, setServings] = useState(2);
  const [maxMinutes, setMaxMinutes] = useState(60);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState([]);
  const [shopping, setShopping] = useState([]);
  const [pantry, setPantry] = useState(
    starter.map((x) => ({
      name: x,
      qty: 1,
      unit: "item",
      expiry: "",
    }))
  );
  const [profile, setProfile] = useState({
    diet: "None",
    spice: "Medium",
    cuisine: "Any",
    allergies: "",
  });
  const [voice, setVoice] = useState(false);
  const [step, setStep] = useState(0);
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem("kk_saved") || "[]"));
      setShopping(JSON.parse(localStorage.getItem("kk_shop") || "[]"));
      setPantry(
        JSON.parse(
          localStorage.getItem("kk_pantry") || JSON.stringify(pantry)
        )
      );
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("kk_saved", JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    localStorage.setItem("kk_shop", JSON.stringify(shopping));
  }, [shopping]);

  useEffect(() => {
    localStorage.setItem("kk_pantry", JSON.stringify(pantry));
  }, [pantry]);

  async function generate() {
    setLoading(true);
    setMessage("");

    try {
      const r = await fetch(API + "/api/recipes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ingredients,
          request,
          servings,
          max_minutes: maxMinutes,
          preferences: profile,
        }),
      });

      const j = await r.json();

      if (!r.ok) {
        throw Error(j.detail || "AI error");
      }

      setRecipe(j);
      setStep(0);
      setTab("Recipes");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function scan(file) {
    setMessage("Scanning image…");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const r = await fetch(API + "/api/scanner", {
        method: "POST",
        body: fd,
      });

      const j = await r.json();

      if (!r.ok) {
        throw Error(j.detail || "Scanner error");
      }

      setIngredients([
        ...new Set([
          ...ingredients,
          ...j.ingredients.map((x) => x.name),
        ]),
      ]);

      setMessage(
        "Ingredients detected. Review your pantry before cooking."
      );
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function makeShopping() {
    if (!recipe) {
      setMessage("Generate a recipe first.");
      return;
    }

    setMessage("Building shopping list…");

    try {
      const r = await fetch(API + "/api/shopping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipe,
          pantry: pantry.map((x) => x.name),
        }),
      });

      const j = await r.json();

      if (!r.ok) {
        throw Error(j.detail);
      }

      setShopping(j.items || []);
      setTab("Shopping");
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function chatSend() {
    if (!chatInput.trim()) {
      return;
    }

    const m = chatInput;

    setChat((c) => [
      ...c,
      {
        role: "user",
        text: m,
      },
    ]);

    setChatInput("");

    try {
      const r = await fetch(API + "/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: m,
          context: {
            recipe,
            pantry,
            profile,
          },
        }),
      });

      const j = await r.json();

      if (!r.ok) {
        throw Error(j.detail);
      }

      setChat((c) => [
        ...c,
        {
          role: "assistant",
          text: j.reply,
        },
      ]);
    } catch (e) {
      setChat((c) => [
        ...c,
        {
          role: "assistant",
          text: e.message,
        },
      ]);
    }
  }

  function addIngredient() {
    const x = prompt("Ingredient name");

    if (x?.trim()) {
      const name = x.trim();

      setIngredients([...ingredients, name]);

      setPantry([
        ...pantry,
        {
          name,
          qty: 1,
          unit: "item",
          expiry: "",
        },
      ]);
    }
  }

  function removeAIIngredient(index) {
    setIngredients(
      ingredients.filter((_, i) => i !== index)
    );
  }

  function speak() {
    if (!("speechSynthesis" in window)) {
      setMessage(
        "Speech is not supported by this browser."
      );
      return;
    }

    if (!recipe) {
      setMessage("Generate a recipe first.");
      return;
    }

    const text = recipe.steps?.[step] || "";

    speechSynthesis.cancel();

    speechSynthesis.speak(
      new SpeechSynthesisUtterance(text)
    );

    setVoice(true);

    setTimeout(() => {
      setVoice(false);
    }, 1200);
  }

  const page = (
    <>
      {tab === "Home" && (
        <>
          <section className="hero">
            <div>
              <div className="eyebrow">
                YOUR PERSONAL AI CHEF
              </div>

              <h1>
                Your kitchen.
                <br />
                <span>Your ingredients.</span>
                <br />
                Infinite possibilities.
              </h1>

              <p>
                Kitchen KingAI turns what you have into
                practical recipes, shopping lists and guided
                cooking sessions.
              </p>

              <div className="actions">
                <button
                  className="primary"
                  onClick={() => setTab("AI Chef")}
                >
                  ✨ Open AI Chef
                </button>

                <button
                  className="secondary"
                  onClick={() => setTab("Scanner")}
                >
                  📸 Scan Ingredients
                </button>
              </div>
            </div>

            <div className="heroArt">
              🍳
              <small>AI CHEF</small>
              <strong>Cook smarter. Waste less.</strong>
            </div>
          </section>

          <div className="grid features">
            {[
              [
                "🤖",
                "AI Chef",
                "Recipe generation and cooking chat.",
              ],
              [
                "🧺",
                "Smart Pantry",
                "Track ingredients and expiry.",
              ],
              [
                "📸",
                "Scanner",
                "Identify visible ingredients.",
              ],
              [
                "🛒",
                "Shopping",
                "Build missing-ingredient lists.",
              ],
              [
                "🥗",
                "Nutrition",
                "Estimated nutrition per serving.",
              ],
              [
                "🎙️",
                "Voice Chef",
                "Hands-free cooking commands.",
              ],
            ].map((x) => (
              <Card key={x[1]}>
                <div className="icon">{x[0]}</div>
                <h3>{x[1]}</h3>
                <p>{x[2]}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "AI Chef" && (
        <Card>
          <h2>🤖 AI Chef</h2>

          <p>
            Tell KingAI what you have and what you want.
          </p>

          {/* AI CHEF INGREDIENTS */}
          <div className="chips">
            {ingredients.map((x, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {x}

                <button
                  type="button"
                  onClick={() => removeAIIngredient(i)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: "0",
                    margin: "0",
                    fontSize: "18px",
                    fontWeight: "bold",
                    lineHeight: "1",
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <button
            className="secondary"
            onClick={addIngredient}
          >
            + Add ingredient
          </button>

          <div className="controls">
            <label>
              Servings

              <select
                value={servings}
                onChange={(e) =>
                  setServings(Number(e.target.value))
                }
              >
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Max time

              <select
                value={maxMinutes}
                onChange={(e) =>
                  setMaxMinutes(Number(e.target.value))
                }
              >
                {[15, 20, 30, 45, 60, 90, 120].map(
                  (n) => (
                    <option key={n} value={n}>
                      {n} min
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <textarea
            value={request}
            onChange={(e) =>
              setRequest(e.target.value)
            }
            placeholder="Ask for anything: e.g. a spicy South Indian dinner with eggs and potatoes, ready in 25 minutes…"
          />

          <button
            className="primary wide"
            onClick={generate}
            disabled={loading}
          >
            {loading
              ? "Creating…"
              : "✨ Invent Recipe"}
          </button>

          <div className="chat">
            <h3>Cooking chat</h3>

            {chat.map((m, i) => (
              <div className={m.role} key={i}>
                {m.text}
              </div>
            ))}

            <div className="chatrow">
              <input
                value={chatInput}
                onChange={(e) =>
                  setChatInput(e.target.value)
                }
                onKeyDown={(e) =>
                  e.key === "Enter" && chatSend()
                }
                placeholder="Ask KingAI…"
              />

              <button onClick={chatSend}>
                Send
              </button>
            </div>
          </div>
        </Card>
      )}

      {tab === "Pantry" && (
        <Card>
          <h2>🧺 Smart Pantry</h2>

          <p>
            These items are used as context for your AI
            recipes.
          </p>

          {pantry.map((x, i) => (
            <div className="row" key={i}>
              <b>{x.name}</b>

              <span>
                {x.qty} {x.unit}
              </span>

              <input
                value={x.expiry}
                onChange={(e) => {
                  const p = [...pantry];

                  p[i] = {
                    ...p[i],
                    expiry: e.target.value,
                  };

                  setPantry(p);
                }}
                type="date"
              />

              <button
                onClick={() =>
                  setPantry(
                    pantry.filter(
                      (_, j) => j !== i
                    )
                  )
                }
              >
                ×
              </button>
            </div>
          ))}

          <button
            className="primary"
            onClick={addIngredient}
          >
            + Add pantry item
          </button>
        </Card>
      )}

      {tab === "Recipes" && (
        <Card>
          <h2>🍲 Recipe Library</h2>

          {recipe ? (
            <Recipe
              recipe={recipe}
              saved={saved}
              setSaved={setSaved}
              setRecipe={setRecipe}
              makeShopping={makeShopping}
              start={() => {
                setStep(0);
                setTab("Cooking Mode");
              }}
            />
          ) : (
            <p>
              No recipe yet. Open AI Chef to create one.
            </p>
          )}

          {saved.length > 0 && (
            <>
              <h3>Saved</h3>

              {saved.map((r, i) => (
                <div
                  className="saved"
                  key={i}
                  onClick={() =>
                    setRecipe(r)
                  }
                >
                  {r.title}
                </div>
              ))}
            </>
          )}
        </Card>
      )}

      {tab === "Scanner" && (
        <Card>
          <h2>📸 Ingredient Scanner</h2>

          <p>
            Upload a food photo. The AI will suggest visible
            ingredients for you to confirm.
          </p>

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              e.target.files?.[0] &&
              scan(e.target.files[0])
            }
          />

          <div className="notice">
            Never upload sensitive personal images.
            Ingredient recognition can be wrong; review
            results before adding them to your pantry.
          </div>
        </Card>
      )}

      {tab === "Shopping" && (
        <Card>
          <h2>🛒 Smart Shopping</h2>

          <button
            className="primary"
            onClick={makeShopping}
          >
            Generate from current recipe
          </button>

          {shopping.map((x, i) => (
            <div className="row" key={i}>
              <span>☐</span>

              <b>{x.name || x}</b>

              <span>
                {x.quantity || x.qty || ""}{" "}
                {x.unit || ""}
              </span>

              <button
                onClick={() =>
                  setShopping(
                    shopping.filter(
                      (_, j) => j !== i
                    )
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
        </Card>
      )}

      {tab === "Nutrition" && (
        <Card>
          <h2>🥗 Nutrition</h2>

          {recipe ? (
            <div className="nutrition">
              <b>
                🔥{" "}
                {recipe.nutrition?.calories ?? "—"} kcal
              </b>

              <b>
                💪{" "}
                {recipe.nutrition?.protein_g ?? "—"}g
                protein
              </b>

              <b>
                🍞{" "}
                {recipe.nutrition?.carbs_g ?? "—"}g carbs
              </b>

              <b>
                🥑{" "}
                {recipe.nutrition?.fat_g ?? "—"}g fat
              </b>

              <b>
                🌾{" "}
                {recipe.nutrition?.fiber_g ?? "—"}g fiber
              </b>

              <p>
                Nutrition is an estimate and is not medical
                advice.
              </p>
            </div>
          ) : (
            <p>Generate a recipe first.</p>
          )}
        </Card>
      )}

      {tab === "Voice Chef" && (
        <Card>
          <h2>🎙️ Voice Chef</h2>

          <p>
            Use browser speech synthesis to read the current
            cooking step aloud.
          </p>

          <button
            className="primary"
            onClick={speak}
          >
            {voice
              ? "🔊 Speaking…"
              : "🔊 Read Current Step"}
          </button>

          <p>
            For full voice-command input, use the microphone
            support in a compatible browser and connect
            commands to the AI chat endpoint.
          </p>
        </Card>
      )}

      {tab === "Cooking Mode" && (
        <Card>
          <h2>⏱️ Cooking Mode</h2>

          {recipe ? (
            <>
              <div className="stepcount">
                STEP {step + 1} / {recipe.steps.length}
              </div>

              <div className="bigstep">
                {recipe.steps[step]}
              </div>

              <div className="actions">
                <button
                  className="secondary"
                  disabled={step === 0}
                  onClick={() =>
                    setStep(step - 1)
                  }
                >
                  ← Back
                </button>

                <button
                  className="primary"
                  disabled={
                    step ===
                    recipe.steps.length - 1
                  }
                  onClick={() =>
                    setStep(step + 1)
                  }
                >
                  Next →
                </button>

                <button
                  className="secondary"
                  onClick={speak}
                >
                  🔊 Read
                </button>
              </div>
            </>
          ) : (
            <p>Generate a recipe first.</p>
          )}
        </Card>
      )}

      {tab === "Profile" && (
        <Card>
          <h2>👤 Profile & Taste Memory</h2>

          {[
            [
              "Diet",
              "diet",
              [
                "None",
                "Vegetarian",
                "Vegan",
                "Halal",
              ],
            ],
            [
              "Spice",
              "spice",
              [
                "Mild",
                "Medium",
                "Hot",
              ],
            ],
            [
              "Cuisine",
              "cuisine",
              [
                "Any",
                "Indian",
                "Italian",
                "Mexican",
                "Asian",
              ],
            ],
          ].map(([l, k, opts]) => (
            <label key={k}>
              {l}

              <select
                value={profile[k]}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    [k]: e.target.value,
                  })
                }
              >
                {opts.map((o) => (
                  <option key={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <label>
            Allergies

            <input
              value={profile.allergies}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  allergies: e.target.value,
                })
              }
              placeholder="e.g. peanuts, shellfish"
            />
          </label>

          <p>
            Preferences are stored locally in this
            prototype.
          </p>
        </Card>
      )}

      {tab === "Security" && (
        <Card>
          <h2>🔐 Security & Production</h2>

          <ul>
            <li>
              API key stays in backend environment
              variables.
            </li>

            <li>.env is ignored by Git.</li>

            <li>
              Validate uploaded image size/type.
            </li>

            <li>
              Use HTTPS, rate limits, secure auth and
              backups before public deployment.
            </li>

            <li>
              Change the demo PostgreSQL password before
              production.
            </li>
          </ul>
        </Card>
      )}
    </>
  );

  return (
    <main>
      <nav>
        <div className="brand">
          ♛ Kitchen KingAI
        </div>

        <div className="tabs">
          {tabs.map((t) => (
            <button
              className={
                tab === t ? "active" : ""
              }
              onClick={() => setTab(t)}
              key={t}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>

      <div className="container">
        {message && (
          <div className="alert">
            {message}
          </div>
        )}

        {page}
      </div>

      <footer>
        Kitchen KingAI · feature-complete prototype · AI
        outputs and nutrition are estimates.
      </footer>
    </main>
  );
}

function Recipe({
  recipe,
  saved,
  setSaved,
  setRecipe,
  makeShopping,
  start,
}) {
  const is = saved.some(
    (x) => x.title === recipe.title
  );

  function removeIngredient(index) {
    const updated = {
      ...recipe,
      ingredients: (
        recipe.ingredients || []
      ).filter((_, i) => i !== index),
    };

    setRecipe(updated);

    setSaved(
      saved.map((x) =>
        x.title === recipe.title
          ? updated
          : x
      )
    );
  }

  return (
    <div className="recipe">
      <div>
        <div className="eyebrow">
          CREATED BY KINGAI
        </div>

        <h1>{recipe.title}</h1>

        <p>{recipe.description}</p>

        <div className="stats">
          <b>⏱ {recipe.minutes} min</b>
          <b>
            👥 {recipe.servings} servings
          </b>
        </div>

        <h3>Ingredients</h3>

        {recipe.ingredients?.length ? (
          <ul>
            {recipe.ingredients.map(
              (x, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                    gap: "12px",
                    marginBottom: "8px",
                  }}
                >
                  <span>{x}</span>

                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      removeIngredient(i)
                    }
                  >
                    🗑️ Remove
                  </button>
                </li>
              )
            )}
          </ul>
        ) : (
          <p>
            No ingredients remaining.
          </p>
        )}

        <h3>Method</h3>

        <ol>
          {recipe.steps?.map(
            (x, i) => (
              <li key={i}>{x}</li>
            )
          )}
        </ol>

        <div className="actions">
          <button
            className="primary"
            onClick={start}
          >
            ▶ Start Cooking
          </button>

          <button
            className="secondary"
            onClick={makeShopping}
          >
            🛒 Shopping List
          </button>

          <button
            className="secondary"
            onClick={() =>
              setSaved(
                is
                  ? saved.filter(
                      (x) =>
                        x.title !==
                        recipe.title
                    )
                  : [
                      ...saved,
                      recipe,
                    ]
              )
            }
          >
            {is
              ? "★ Saved"
              : "☆ Save Recipe"}
          </button>
        </div>
      </div>
    </div>
  );
}
