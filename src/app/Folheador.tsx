import { useEffect, useRef, useState } from 'react';
import { movimentoReduzido } from '../shared/plataforma/index.ts';
import { folhaVista, larguraDaFolha, totalDeFolhas } from './folhas.ts';

export type Capitulo = 'chat' | 'mesa' | 'meus' | 'importar';
type Sentido = 'frente' | 'tras';
type Estado = { folha: number; total: number; virando: Sentido | null };

const SEM_FOLHAS: Estado = { folha: 1, total: 1, virando: null };
const corpoAberto = () => document.querySelector<HTMLElement>('.livro > aside[data-open="true"] .import-body');

// The shell owns the book: chapters whose body is laid out in columns are paged here instead of scrolled.
function medidas(corpo: HTMLElement) {
  const cs = getComputedStyle(corpo);
  return { largura: corpo.clientWidth, conteudo: corpo.scrollWidth, vao: parseFloat(cs.columnGap) || 0, colunas: Number(cs.columnCount) > 1 };
}

// The turn lasts --t-longo (index.css); not copied here. Unreadable means no animation.
function duracaoDaVirada(): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--t-longo').trim();
  return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000;
}

export function Folheador({ capitulo }: { capitulo: Capitulo | null }) {
  const [estado, setEstado] = useState<Estado>(SEM_FOLHAS);
  const corpoRef = useRef<HTMLElement | null>(null);
  const timers = useRef<number[]>([]);
  const clicada = useRef<Sentido | null>(null);

  useEffect(() => {
    const corpo = capitulo ? corpoAberto() : null;
    corpoRef.current = corpo;
    // oxlint-disable-next-line react/set-state-in-effect -- the book is external DOM: a new chapter starts on sheet 1
    setEstado(SEM_FOLHAS);
    if (!corpo) return;
    const ler = () => {
      const m = medidas(corpo);
      const total = m.colunas ? totalDeFolhas(m.conteudo, m.largura, m.vao) : 1;
      const folha = m.colunas ? folhaVista(corpo.scrollLeft, m.conteudo, m.largura, m.vao) : 1;
      setEstado((e) => (e.total === total && e.folha === folha ? e : { ...e, total, folha }));
    };
    ler();
    // The body has a fixed size, so its own resize only covers the window changing. Content that grows inside it
    // shows up as a section crossing the sheet's edge: a section split across columns never fires a ResizeObserver
    // (Chrome), but its box moving in or out of the visible sheet fires an IntersectionObserver rooted at the body.
    const ro = new ResizeObserver(ler);
    ro.observe(corpo);
    const io = new IntersectionObserver(ler, { root: corpo, threshold: [0, 0.25, 0.5, 0.75, 1] });
    const observar = () => { io.disconnect(); Array.from(corpo.children).forEach((f) => io.observe(f)); };
    observar();
    // Switching the background type adds fields; the focus ring can also scroll the body to another sheet (scroll).
    const mo = new MutationObserver(() => { observar(); ler(); });
    mo.observe(corpo, { childList: true, subtree: true, characterData: true });
    corpo.addEventListener('scroll', ler);
    // Late fonts and images change the layout without touching the DOM; `load` does not bubble, hence capture.
    let vivo = true;
    document.fonts.addEventListener('loadingdone', ler);
    void document.fonts.ready.then(() => { if (vivo) ler(); });
    corpo.addEventListener('load', ler, true);
    return () => {
      vivo = false;
      ro.disconnect(); io.disconnect(); mo.disconnect(); corpo.removeEventListener('scroll', ler);
      document.fonts.removeEventListener('loadingdone', ler); corpo.removeEventListener('load', ler, true);
      timers.current.forEach(clearTimeout); timers.current = [];
      corpo.scrollLeft = 0; delete corpo.dataset.folheando;
    };
  }, [capitulo]);

  // After a turn the focus stays on the clicked arrow, or moves to the other one if that one is gone.
  useEffect(() => {
    if (estado.virando || !clicada.current) return;
    const outro = clicada.current === 'frente' ? 'tras' : 'frente';
    const seta = document.querySelector<HTMLElement>(`.livro .folhear-${clicada.current}`) ?? document.querySelector<HTMLElement>(`.livro .folhear-${outro}`);
    clicada.current = null;
    seta?.focus();
  }, [estado.virando, estado.folha]);

  const virar = (sentido: Sentido) => {
    const corpo = corpoRef.current;
    if (!corpo || estado.virando) return;
    const m = medidas(corpo);
    const alvo = (estado.folha - 1 + (sentido === 'frente' ? 1 : -1)) * larguraDaFolha(m.largura, m.vao);
    clicada.current = sentido;
    const duracao = duracaoDaVirada();
    if (movimentoReduzido() || !(duracao > 0)) { corpo.scrollLeft = alvo; return; }
    corpo.dataset.folheando = '';
    setEstado((e) => ({ ...e, virando: sentido }));
    // The page is edge-on over the spine at half the turn: that is when the content underneath changes.
    timers.current = [
      window.setTimeout(() => { corpo.scrollLeft = alvo; }, duracao / 2),
      window.setTimeout(() => { delete corpo.dataset.folheando; setEstado((e) => ({ ...e, virando: null })); }, duracao),
    ];
  };

  if (estado.total < 2) return null;
  return (
    <>
      {estado.virando && <div className="folha-virando" data-sentido={estado.virando} aria-hidden="true" />}
      <span className="folhear-indice" aria-live="polite">folha {estado.folha} de {estado.total}</span>
      {estado.folha > 1 && <button className="folhear folhear-tras" aria-label="Página anterior" onClick={() => virar('tras')}><span aria-hidden="true">‹</span></button>}
      {estado.folha < estado.total && <button className="folhear folhear-frente" aria-label="Próxima página" onClick={() => virar('frente')}><span aria-hidden="true">›</span></button>}
    </>
  );
}
