# 🧠 AI SaaS RAG Agent — Source-Aware Chat + GTM Content Engine

An AI-powered SaaS application that ingests **websites & documents**, builds structured context, and enables **context-aware chat, lead generation, and sales content creation**.

This project demonstrates how to architect a **production-ready Retrieval-Augmented Generation (RAG) system** with:

- 🔐 Secure multi-tenant data (Supabase + RLS)
- 🌐 Website crawling & structured ingestion
- 💬 Context-aware AI chat
- 📈 GTM content generation (sales, lead strategy, social content)

---

## 🚀 What This Project Solves

Most AI chat apps fail at:
- ❌ Using real business context
- ❌ Structuring external data
- ❌ Generating actionable outputs (sales, leads, strategy)

This system bridges that gap by:

> Turning raw website/data inputs → into structured knowledge → into business-ready outputs

---

## ⚙️ Core Features

### 📥 Source Ingestion
- Upload files (PDF / docs)
- Add websites (URL-based crawling)
- Extract:
  - Titles
  - Descriptions
  - Full page content
  - Internal links (controlled crawl depth)

---

### 🧠 AI Chat (RAG-powered)
- Answers based only on uploaded sources
- Prevents hallucination via source grounding
- Maintains chat history per user

---

### 📊 GTM Intelligence Layer
The agent can generate:

- Lead generation strategies
- ICP (Ideal Customer Profile)
- Sales pitches
- LinkedIn content
- Marketing angles
- Product positioning

All grounded in real source data.

---

### 🔐 Multi-Tenant Security (Supabase + RLS)
- Row Level Security (RLS) enforced
- Per-user isolation of:
  - sources
  - chats
  - messages
- Auth-integrated backend APIs

---

## 🏗️ Architecture

```bash
Frontend (Next.js App Router)
        ↓
API Routes (Server-side logic)
        ↓
Supabase (Auth + Postgres + RLS)
        ↓
Source Storage (JSON snapshots)
        ↓
OpenAI (LLM for reasoning)
