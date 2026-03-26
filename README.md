# 🧠 AI SaaS Agent — Source-Aware Chat + GTM Engine

> Turn any website or document into a sales strategist, content generator, and knowledge engine.

---

## 🚀 Demo Flow

1. Add a website (e.g. ecommerce, SaaS, brand)
2. System crawls & structures content
3. Ask:
   - “Give me ICP”
   - “Write LinkedIn posts”
   - “Create sales pitch”
4. Get **context-aware outputs**

---

## ✨ What It Does

### 📥 Ingests Data
- Upload files (PDF / docs)
- Add websites (URL crawling)
- Extracts:
  - page content
  - metadata
  - internal links

---

### 💬 AI Chat (RAG-style)
- Answers ONLY from your data
- Avoids hallucination
- Maintains chat history

---

### 📈 GTM Engine (Real Differentiator)

Generates:

- 🧲 Lead strategies  
- 🎯 ICP definitions  
- 💬 Sales pitch  
- 🧵 LinkedIn content  
- 📣 Marketing angles  

---

## 🏗️ Architecture
Next.js (Frontend)
↓
API Routes (Server)
↓
Supabase (Auth + DB + RLS)
↓
Source Snapshots (JSON)
↓
OpenAI (LLM)


---

## 🔐 Security (RLS)

Each table is protected with:

```sql
user_id = auth.uid()

Built By

Muhaiminul Hossain
Product Leader → AI Systems Builder

🔗 LinkedIn: https://www.linkedin.com/in/muhaiminulhossain/

💻 GitHub: https://github.com/muhaiminulhossain

