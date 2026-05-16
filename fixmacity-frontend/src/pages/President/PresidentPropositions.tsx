import { useState, useEffect, useCallback } from "react";
import { TreePine, Calendar, ThumbsUp, ThumbsDown, Users, Edit2, Trash2 } from "lucide-react";
import PresidentLayout from "../../layouts/PresidentLayout";

const API = import.meta.env.VITE_API_URL || "http://localhost:5005/api";
const tok = () => localStorage.getItem("fmc_token") || "";

const apiFetch = async (path: string, opts: any = {}) => {
  const r = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${tok()}`,
      "Content-Type": "application/json",
      ...opts.headers,
    },
    ...opts,
  });
  if (!r.ok) throw new Error(await r.text());
  if (r.status === 204) return null;
  return r.json();
};

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (d: any) => new Date(d).toLocaleDateString("fr-FR");
const isExpired = (d: any) => new Date(d) < new Date();
const statusColor: any = {
  active:     "bg-green-100 text-green-700 border border-green-200",
  closed:     "bg-gray-100 text-gray-600 border border-gray-200",
  draft:      "bg-yellow-100 text-yellow-700 border border-yellow-200",
  en_attente: "bg-blue-100 text-blue-700 border border-blue-200",
  confirme:   "bg-green-100 text-green-700 border border-green-200",
  retenu:     "bg-purple-100 text-purple-700 border border-purple-200",
  rejete:     "bg-red-100 text-red-700 border border-red-200",
};
const statusLabel: any = {
  active: "Actif", closed: "Clôturé", draft: "Brouillon",
  en_attente: "En attente", confirme: "Confirmé", retenu: "Retenu", rejete: "Rejeté",
};

// ─── Mock data (used when Supabase is unreachable) ──────────────────────────
const MOCK_PRES = [
  { id: "1", title: "Rénovation du parc central", description: "Réaménagement complet du parc avec de nouveaux équipements sportifs et zones de détente.", category: "Espaces Verts", date_debut: "2025-01-01", date_cloture: "2025-06-30", status: "active", votes_pour: 145, votes_contre: 23, total_votes: 168 },
  { id: "2", title: "Nouvelles pistes cyclables", description: "Création de 12 km de pistes cyclables sécurisées reliant les quartiers principaux.", category: "Voirie", date_debut: "2025-02-01", date_cloture: "2025-04-01", status: "closed", votes_pour: 312, votes_contre: 45, total_votes: 357 },
  { id: "3", title: "Éclairage LED dans tous les quartiers", description: "Remplacement progressif de l'éclairage public par des LED pour réduire la consommation.", category: "Éclairage public", date_debut: "2025-03-01", date_cloture: "2025-09-30", status: "active", votes_pour: 78, votes_contre: 12, total_votes: 90 },
];
const MOCK_CITI = [
  { id: "a", title: "Réparation des trottoirs Rue de la Liberté", description: "Les trottoirs sont en mauvais état et dangereux pour les piétons.", category: "Voirie", citizen_name: "Ahmed Ben Ali", citizen_email: "ahmed@email.com", localisation: "Rue de la Liberté, Sousse", status: "en_attente", created_at: "2025-05-01" },
  { id: "b", title: "Manque de poubelles dans le quartier", description: "Le quartier El Kantaoui manque de poubelles publiques, ce qui cause des problèmes d'hygiène.", category: "Propreté", citizen_name: "Fatma Trabelsi", citizen_email: "fatma@email.com", localisation: "El Kantaoui", status: "confirme", created_at: "2025-04-20" },
  { id: "c", title: "Feux de signalisation défaillants", description: "Plusieurs feux de signalisation au carrefour principal ne fonctionnent plus correctement.", category: "Signalisation", citizen_name: "Mohamed Chakroun", citizen_email: "med@email.com", localisation: "Carrefour Avenue Bourguiba", status: "retenu", created_at: "2025-04-10" },
];

// ─── Modal Component ─────────────────────────────────────────────────────────
const Modal = ({ children, onClose }: any) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
      {children}
    </div>
  </div>
);

// ─── Confirmation Dialog ──────────────────────────────────────────────────────
const ConfirmDialog = ({ message, onConfirm, onCancel }: any) => (
  <Modal onClose={onCancel}>
    <div className="p-6 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">⚠️</span>
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">Confirmation</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-center">
        <button onClick={onCancel} className="px-6 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">Annuler</button>
        <button onClick={onConfirm} className="px-6 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all">Confirmer</button>
      </div>
    </div>
  </Modal>
);

// ─── PRESIDENT PROPOSITION CARD ──────────────────────────────────────────────
const PresCard = ({ prop, onEdit, onDelete }: any) => {
  const daysLeft = prop.end_date ? Math.max(0, Math.ceil((new Date(prop.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))) : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all flex flex-col gap-6 relative overflow-hidden group">
      {/* Category Badge Floating */}
      <div className="absolute top-0 right-0 px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-bl-xl border-l border-b border-indigo-100">
        {prop.category || "Général"}
      </div>

      {/* Top section: Icon + Title & Description */}
      <div className="flex items-start gap-4 pr-16">
        <div className="w-14 h-14 rounded-xl bg-slate-50 text-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-100">
          <Activity size={28} />
        </div>
        <div>
          <h3 className="font-bold text-[#0A1628] text-lg mb-1 leading-tight group-hover:text-indigo-600 transition-colors">{prop.title}</h3>
          <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">{prop.description}</p>
        </div>
      </div>

      {/* Middle section: Dates & Status */}
      <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Période</p>
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar size={14} className="text-indigo-500" />
            <span className="text-sm font-bold">{fmt(prop.start_date)} — {fmt(prop.end_date)}</span>
          </div>
        </div>
        <div className="text-right space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Statut</p>
          <span className={`inline-block text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${statusColor[prop.status] || statusColor.active}`}>
            {statusLabel[prop.status] || prop.status}
          </span>
        </div>
      </div>

      {/* Stats section */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50">
          <div className="flex items-center gap-2 mb-1">
            <ThumbsUp size={14} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Pour</span>
          </div>
          <p className="text-xl font-black text-emerald-700">{prop.votes_pour || 0}</p>
        </div>
        <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100/50">
          <div className="flex items-center gap-2 mb-1">
            <ThumbsDown size={14} className="text-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Contre</span>
          </div>
          <p className="text-xl font-black text-rose-700">{prop.votes_contre || 0}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total</span>
          </div>
          <p className="text-xl font-black text-[#0A1628]">{prop.total || 0}</p>
        </div>
      </div>

      {/* Bottom section: Actions */}
      <div className="flex gap-2 mt-auto">
        <button onClick={() => onEdit(prop)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-indigo-600 font-bold text-xs transition-all shadow-sm">
          <Edit2 size={14} /> Modifier
        </button>
        <button onClick={() => onDelete(prop)} className="px-4 flex items-center justify-center py-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs transition-all border border-rose-100">
          <Trash2 size={14} />
        </button>
      </div>

      {daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400" title={`${daysLeft} jours restants`} />
      )}
    </div>
  );
};

const CitiCard = ({ prop, onDecide }: any) => {
  const score = prop.votes_pour - prop.votes_contre;
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all flex flex-col relative overflow-hidden group">
      {/* Header with Score & Category */}
      <div className="flex items-center justify-between mb-4">
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
          prop.status === 'en_attente' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
          prop.status === 'confirme' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          'bg-indigo-50 text-indigo-600 border-indigo-100'
        }`}>
          {statusLabel[prop.status] || prop.status}
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Tag size={12} />
          <span className="text-[10px] font-black uppercase tracking-widest">{prop.category || "Général"}</span>
        </div>
      </div>

      <h3 className="font-bold text-[#0A1628] text-base mb-2 leading-tight pr-4 line-clamp-1">{prop.title}</h3>
      <p className="text-slate-500 text-sm mb-6 line-clamp-3 flex-grow">{prop.description}</p>

      {/* Citoyen Info Card */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm font-black text-xs">
            {prop.citizen_name?.[0] || "C"}
          </div>
          <div>
            <p className="text-xs font-black text-[#0A1628]">{prop.citizen_name || "Citoyen"}</p>
            <p className="text-[10px] text-slate-400 font-medium">{fmt(prop.created_at)}</p>
          </div>
        </div>
        <div className="pt-3 border-t border-slate-200/50 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <ThumbsUp size={14} className="text-emerald-500" />
            <span className="text-xs font-bold text-slate-700">{prop.votes_pour || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThumbsDown size={14} className="text-rose-500" />
            <span className="text-xs font-bold text-slate-700">{prop.votes_contre || 0}</span>
          </div>
        </div>
      </div>

      {/* Decision Actions */}
      <div className="pt-2">
        {prop.status === "en_attente" ? (
          <div className="flex gap-2">
            <button 
              onClick={() => onDecide(prop, "confirme")} 
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-xs transition-all shadow-sm shadow-emerald-200"
            >
              <CheckCircle2 size={14} /> Confirmer
            </button>
            <button 
              onClick={() => onDecide(prop, "retenu")} 
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs transition-all shadow-sm"
            >
              <Star size={14} /> Retenu
            </button>
          </div>
        ) : (
          <div className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs border ${
            prop.status === "confirme" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-indigo-50 text-indigo-600 border-indigo-100"
          }`}>
            {prop.status === "confirme" ? <CheckCircle2 size={14} /> : <Star size={14} />}
            {prop.status === "confirme" ? "Proposition Confirmée" : "Proposition Retenue"}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PROPOSITION FORM MODAL ──────────────────────────────────────────────────
const PropForm = ({ initial, onSave, onClose }: any) => {
  const [form, setForm] = useState(initial || { title: "", description: "", category: "Voirie", start_date: "", end_date: "", status: "active" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.start_date || !form.end_date) {
      setErr("Veuillez remplir tous les champs obligatoires."); return;
    }
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      setErr("La date de clôture doit être après la date de début."); return;
    }
    setLoading(true); setErr("");
    try { await onSave(form); onClose(); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-800">{initial ? "✏️ Modifier la proposition" : "➕ Nouvelle proposition"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">⚠️ {err}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Titre de la proposition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
            <select value={form.category || "Voirie"} onChange={e => set("category", e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
              <option value="Voirie">Voirie</option>
              <option value="Éclairage public">Éclairage public</option>
              <option value="Propreté">Propreté</option>
              <option value="Espaces Verts">Espaces Verts</option>
              <option value="Réseaux">Réseaux</option>
              <option value="Signalisation">Signalisation</option>
              <option value="Général">Général</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" placeholder="Description détaillée..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
              <input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de clôture *</label>
              <input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select value={form.status} onChange={e => set("status", e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
              <option value="draft">Brouillon</option>
              <option value="active">Actif</option>
              <option value="closed">Clôturé</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all font-medium">Annuler</button>
          <button onClick={submit} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all font-medium disabled:opacity-60">
            {loading ? "Enregistrement..." : (initial ? "Mettre à jour" : "Publier")}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── DETAIL MODAL ────────────────────────────────────────────────────────────
const DetailModal = ({ prop, onClose, onDecide }: any) => {
  const [note, setNote] = useState("");
  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">📋 Détails de la proposition</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[prop.status] || statusColor.en_attente}`}>{statusLabel[prop.status]}</span>
            <span className="text-xs text-indigo-600 font-semibold">{prop.category || "Général"}</span>
          </div>
          <h3 className="text-lg font-bold text-gray-800">{prop.title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{prop.description}</p>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <p className="flex items-center gap-2">👤 <span><b>{prop.citizen_name}</b> — {prop.citizen_email}</span></p>
            {prop.localisation && <p className="flex items-center gap-2">📍 <span>{prop.localisation}</span></p>}
            <p className="flex items-center gap-2">📅 <span>Soumis le {fmt(prop.created_at)}</span></p>
          </div>
        </div>
        {prop.status === "en_attente" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Note du président (optionnel)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" placeholder="Ajouter une note interne..." />
            <div className="flex gap-3">
              <button onClick={() => { onDecide(prop, "confirme", note); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-green-500 text-white hover:bg-green-600 font-medium transition-all">✅ Confirmer</button>
              <button onClick={() => { onDecide(prop, "retenu", note); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white hover:bg-purple-600 font-medium transition-all">📌 Retenu</button>
            </div>
          </div>
        )}
        {prop.status !== "en_attente" && (
          <div className={`text-center py-3 rounded-xl text-sm font-medium ${prop.status === "confirme" ? "bg-green-50 text-green-600" : "bg-purple-50 text-purple-600"}`}>
            {prop.status === "confirme" ? "✅ Cette proposition a été confirmée" : "📌 Cette proposition est retenue"}
            {prop.president_note && <p className="text-gray-500 text-xs mt-1 font-normal">Note: {prop.president_note}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
};

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function PresidentPropositions() {
  const [tab, setTab] = useState("president");
  const [presProps, setPresProps] = useState<any[]>([]);
  const [citiProps, setCitiProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editProp, setEditProp] = useState<any>(null);
  const [deleteProp, setDeleteProp] = useState<any>(null);
  const [detailProp, setDetailProp] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [toastMsg, setToastMsg] = useState<any>(null);
  const [search, setSearch] = useState("");

  const notify = (msg: string, type = "success") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/president/propositions");
      if (data && data.success) {
        const pp = data.presidential || [];
        const cp = data.citizen || [];
        
        setPresProps(pp.map((p: any) => ({
          ...p,
          start_date: p.start_date || p.created_at,
          end_date: p.end_date,
          status: p.status || 'active',
          votes_pour: p.pour || 0,
          votes_contre: p.contre || 0,
          total: p.total || 0
        })));
        
        setCitiProps(cp.map((p: any) => ({
          ...p,
          citizen_name: p.citizen || 'Anonyme',
          citizen_email: '', // Not returned by backend in standard list
          localisation: p.localisation || '',
          status: p.status || 'en_attente'
        })));
        setUseMock(false);
      }
    } catch (e) {
      console.error(e);
      setPresProps(MOCK_PRES);
      setCitiProps(MOCK_CITI);
      setUseMock(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── CRUD president propositions ────────────────────────────────────────────
  const saveProp = async (form: any) => {
    if (useMock) {
      if (editProp) setPresProps(p => p.map(x => x.id === editProp.id ? { ...x, ...form } : x));
      else setPresProps(p => [{ ...form, id: Date.now().toString(), votes_pour: 0, votes_contre: 0, total: 0 }, ...p]);
      notify(editProp ? "Proposition mise à jour ✓" : "Proposition publiée ✓");
      setEditProp(null); return;
    }
    
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status
      };
      
      if (editProp) {
        await apiFetch(`/president/propositions/${editProp.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/president/propositions", { method: "POST", body: JSON.stringify(payload) });
      }
      notify(editProp ? "Proposition mise à jour ✓" : "Proposition publiée ✓");
      setEditProp(null);
      fetchAll();
    } catch (e: any) {
      notify(e.message || "Erreur lors de l'enregistrement", "error");
    }
  };

  const deletePropFn = async () => {
    if (useMock) { setPresProps(p => p.filter(x => x.id !== deleteProp.id)); }
    else { 
      try {
        await apiFetch(`/president/propositions/${deleteProp.id}`, { method: "DELETE" });
        fetchAll(); 
      } catch (e: any) {
        notify("Erreur de suppression", "error");
      }
    }
    notify("Proposition supprimée", "error");
    setDeleteProp(null);
  };

  // ── decide citizen proposition ─────────────────────────────────────────────
  const decideProp = async (prop: any, decision: string, note = "") => {
    if (useMock) {
      setCitiProps(p => p.map(x => x.id === prop.id ? { ...x, status: decision, president_note: note } : x));
    } else {
      try {
        await apiFetch(`/president/propositions/${prop.id}/${decision === 'confirme' ? 'confirmer' : 'retenu'}`, {
          method: "POST",
          body: JSON.stringify({ president_note: note }),
        });
        fetchAll();
      } catch (e: any) {
        notify("Erreur lors de la mise à jour", "error");
      }
    }
    notify(`Proposition ${decision === "confirme" ? "confirmée ✅" : "retenue 📌"}`);
  };

  // ── filtered data ──────────────────────────────────────────────────────────
  const filteredPres = presProps.filter(p =>
    (filterStatus === "all" || p.status === filterStatus) &&
    (p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredCiti = citiProps.filter(p =>
    (filterStatus === "all" || p.status === filterStatus) &&
    (p.title.toLowerCase().includes(search.toLowerCase()) || (p.citizen_name || "").toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    totalPres: presProps.length,
    activePres: presProps.filter(p => p.status === "active").length,
    totalVotes: presProps.reduce((s, p) => s + (p.total || 0), 0),
    pending: citiProps.filter(p => p.status === "en_attente").length,
    confirmed: citiProps.filter(p => p.status === "confirme").length,
    retained: citiProps.filter(p => p.status === "retenu").length,
  };

  return (
    <PresidentLayout title="Gestion des Propositions">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 pb-12">
        {/* Toast */}
        {toastMsg && (
          <div className={`fixed top-5 right-5 z-[100] px-5 py-3 rounded-2xl shadow-lg text-white text-sm font-medium transition-all ${toastMsg.type === "error" ? "bg-red-500" : "bg-green-500"}`}>
            {toastMsg.msg}
          </div>
        )}

        {/* Header */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">🏛️</div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Gestion des Propositions</h1>
                <p className="text-xs text-gray-400">Président Municipal — Sousse</p>
              </div>
            </div>
            {useMock && <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200">⚠️ Mode démo</span>}
            {tab === "president" && (
              <button onClick={() => { setEditProp(null); setShowForm(true); }} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm">
                ➕ Nouvelle proposition
              </button>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {tab === "president" ? (
              <>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-xl">📋</div>
                  <div><p className="text-2xl font-bold text-gray-800">{stats.totalPres}</p><p className="text-xs text-gray-400">Total propositions</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">✅</div>
                  <div><p className="text-2xl font-bold text-green-600">{stats.activePres}</p><p className="text-xs text-gray-400">Propositions actives</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">🗳️</div>
                  <div><p className="text-2xl font-bold text-blue-600">{stats.totalVotes}</p><p className="text-xs text-gray-400">Votes totaux</p></div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">⏳</div>
                  <div><p className="text-2xl font-bold text-blue-600">{stats.pending}</p><p className="text-xs text-gray-400">En attente</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">✅</div>
                  <div><p className="text-2xl font-bold text-green-600">{stats.confirmed}</p><p className="text-xs text-gray-400">Confirmées</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl">📌</div>
                  <div><p className="text-2xl font-bold text-purple-600">{stats.retained}</p><p className="text-xs text-gray-400">Retenues</p></div>
                </div>
              </>
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 p-1.5 flex gap-1">
            {[
              { key: "president", label: "🏛️ Propositions du Président", count: presProps.length },
              { key: "citizen", label: "👥 Propositions Citoyennes", count: citiProps.filter(p => p.status === "en_attente").length },
            ].map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setFilterStatus("all"); setSearch(""); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${tab === t.key ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
                {t.label}
                {t.count > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${tab === t.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher..." className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
            <div className="flex gap-2 flex-wrap">
              {(tab === "president"
                ? [["all", "Tous"], ["active", "Actif"], ["closed", "Clôturé"], ["draft", "Brouillon"]]
                : [["all", "Tous"], ["en_attente", "En attente"], ["confirme", "Confirmé"], ["retenu", "Retenu"]]
              ).map(([v, l]) => (
                <button key={v} onClick={() => setFilterStatus(v)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterStatus === v ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-20 text-gray-400">
              <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
              <p>Chargement...</p>
            </div>
          ) : tab === "president" ? (
            filteredPres.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-5xl mb-3">📭</p>
                <p className="font-medium">Aucune proposition trouvée</p>
                <button onClick={() => { setEditProp(null); setShowForm(true); }} className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700">
                  Créer la première proposition
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPres.map(p => (
                  <PresCard key={p.id} prop={p}
                    onEdit={(prop: any) => { setEditProp(prop); setShowForm(true); }}
                    onDelete={(prop: any) => setDeleteProp(prop)} />
                ))}
              </div>
            )
          ) : (
            filteredCiti.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-5xl mb-3">📭</p>
                <p className="font-medium">Aucune proposition citoyenne trouvée</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCiti.map(p => (
                  <CitiCard key={p.id} prop={p}
                    onDecide={(prop: any, dec: string) => setDetailProp({ ...prop, _pendingDecision: dec }) || decideProp(prop, dec)} />
                ))}
              </div>
            )
          )}
        </div>

        {/* Modals */}
        {showForm && (
          <PropForm initial={editProp} onSave={saveProp} onClose={() => { setShowForm(false); setEditProp(null); }} />
        )}
        {deleteProp && (
          <ConfirmDialog
            message={`Supprimer la proposition "${deleteProp.title}" ? Cette action est irréversible.`}
            onConfirm={deletePropFn}
            onCancel={() => setDeleteProp(null)} />
        )}
        {detailProp && (
          <DetailModal prop={detailProp} onClose={() => setDetailProp(null)} onDecide={decideProp} />
        )}
      </div>
    </PresidentLayout>
  );
}
