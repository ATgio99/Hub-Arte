#!/bin/bash
cd "$(dirname "$0")"

# Verifica che Node.js sia installato
if ! command -v node &> /dev/null; then
  echo "❌ Node.js non trovato. Installalo da https://nodejs.org"
  echo "   Scarica la versione LTS e riprova."
  read -p "Premi Invio per chiudere..."
  exit 1
fi

# Verifica che npm sia installato
if ! command -v npm &> /dev/null; then
  echo "❌ npm non trovato. Installa Node.js da https://nodejs.org"
  read -p "Premi Invio per chiudere..."
  exit 1
fi

# Prima volta? Installa le dipendenze
if [ ! -d "node_modules" ]; then
  echo "📦 Prima esecuzione: installazione dipendenze..."
  npm install
  if [ $? -ne 0 ]; then
    echo "❌ Errore nell'installazione delle dipendenze."
    read -p "Premi Invio per chiudere..."
    exit 1
  fi
  echo "✅ Dipendenze installate!"
  echo ""
fi

echo "🏛️  Avvio HUB Art — Atlante Neuronale"
echo "   Sito:       http://localhost:5173"
echo "   Gestione:   http://localhost:5173/admin.html"
echo "   Login:      http://localhost:5173/#/login"
echo ""
echo "   Lascia aperta questa finestra."
echo "   Premi Ctrl+C per fermare il server."
echo ""

# Apri il browser dopo 2 secondi
(sleep 2 && open "http://localhost:5173") &

# Avvia Vite dev server
npx vite --host
