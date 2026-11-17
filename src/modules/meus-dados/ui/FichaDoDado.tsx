// The sheet of one imported die (OS-0085): the 3D window and every trait that can be changed, live.
// Changing the die fades the old content out (150 ms), then the new one enters: window, flash and the fields in a cascade.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { carregarModelo, customDie, customKind, finishOf, gemColor, hasTexture, type CustomDie } from '../../dados/index.ts';
import { slugProblem } from '../../selecao/index.ts';
import { movimentoReduzido } from '../../../shared/plataforma/index.ts';
import { camposDaFicha, type CampoDaFicha } from '../domain/ficha.ts';
import { atualizar } from '../store.ts';
import { InkChoice } from './InkChoice.tsx';
import { JanelaDoDado } from './JanelaDoDado.tsx';
import { useMeusDados } from './useMeusDados.tsx';

const COR_ESPERA = 300; // the colour picker fires on every move

function Campos({ die, aoMudar }: { die: CustomDie; aoMudar: () => void }) {
  const { customs } = useMeusDados();
  const campos = camposDaFicha(die);
  const tem = (c: CampoDaFicha) => campos.includes(c);
  const [nome, setNome] = useState(die.name);
  const [apelido, setApelido] = useState(die.slug);
  const [erro, setErro] = useState('');
  const [cor, setCor] = useState(die.color ?? gemColor(customKind(die.id)));
  const [texturado, setTexturado] = useState(false);
  const espera = useRef<number | undefined>(undefined);
  const corPendente = useRef<string | null>(null);

  // Always from the die as it is now, so a change never overwrites another that landed in between.
  const mudar = (patch: Partial<CustomDie>) => {
    void atualizar({ ...(customDie(customKind(die.id)) ?? die), ...patch });
    aoMudar();
  };
  const gravarCor = () => {
    window.clearTimeout(espera.current);
    if (corPendente.current !== null) { const c = corPendente.current; corPendente.current = null; mudar({ color: c }); }
  };
  // Leaving the die (or the chapter) with a colour still waiting: save it now.
  useEffect(() => gravarCor, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (die.file.format !== 'glb') return;
    let vivo = true;
    void carregarModelo(die).then((o) => { if (vivo) setTexturado(hasTexture(o)); });
    return () => { vivo = false; };
  }, [die.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const gravarNome = () => {
    const limpo = nome.trim();
    if (!limpo) { setNome(die.name); return; }
    if (limpo !== die.name) mudar({ name: limpo });
    setNome(limpo);
  };
  const gravarApelido = () => {
    if (apelido === die.slug) { setErro(''); return; }
    const problema = slugProblem(apelido, customs.filter((d) => d.id !== die.id));
    setErro(problema ?? '');
    if (!problema) mudar({ slug: apelido });
  };
  const enter = (grava: () => void) => (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); grava(); } };

  const linhas: ReactNode[] = [];
  const linha = (chave: string, filho: ReactNode) => linhas.push(<div key={chave} className="ficha-linha" style={{ '--i': linhas.length } as CSSProperties}>{filho}</div>);
  linha('nome', <label>Nome <input value={nome} maxLength={40} onChange={(e) => setNome(e.target.value)} onBlur={gravarNome} onKeyDown={enter(gravarNome)} /></label>);
  linha('apelido', <>
    <label>Apelido no chat <input value={apelido} aria-describedby="ficha-apelido" aria-invalid={erro !== ''} onChange={(e) => setApelido(e.target.value.toLowerCase())} onBlur={gravarApelido} onKeyDown={enter(gravarApelido)} /></label>
    <small id="ficha-apelido">Ex.: {die.base === 'livre' ? '2' : `2d${die.base.slice(1)}`}{apelido || 'apelido'}</small>
    {erro && <p role="alert" className="import-error">{erro}</p>}
  </>);
  if (tem('tinta') || tem('acabamento')) linha('tinta', <InkChoice ink={die.ink ?? 'auto'} finish={finishOf(die)} engraved={tem('tinta')} stl={tem('acabamento')} textured={texturado}
    onInk={(ink) => mudar({ ink })} onFinish={(finish) => mudar({ finish })} />);
  if (tem('gema')) linha('gema', <label>Cor da gema <input type="color" value={cor} onChange={(e) => {
    setCor(e.target.value); corPendente.current = e.target.value;
    window.clearTimeout(espera.current); espera.current = window.setTimeout(gravarCor, COR_ESPERA);
  }} /></label>);
  if (tem('presagios')) linha('presagios', <label><input type="checkbox" checked={die.omens} onChange={(e) => mudar({ omens: e.target.checked })} /> Conta como d20 nos presságios</label>);
  return <>{linhas}</>;
}

export function FichaDoDado({ die }: { die: CustomDie | undefined }) {
  const { customs } = useMeusDados();
  const [mostradoId, setMostradoId] = useState(die?.id);
  const [pulso, setPulso] = useState(0);
  const secao = useRef<HTMLElement>(null);
  const primeira = useRef(true);

  // With reduced motion the sheet changes at once; otherwise the old content leaves first.
  if ((movimentoReduzido() || mostradoId === undefined) && mostradoId !== die?.id) setMostradoId(die?.id);
  useEffect(() => {
    if (mostradoId === die?.id) return;
    const t = window.setTimeout(() => setMostradoId(die?.id), 150);
    return () => window.clearTimeout(t);
  }, [die?.id, mostradoId]);
  // The new die is on the page: it turns in from the spine (not on the first opening, which the chapter itself turns).
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    if (movimentoReduzido()) return;
    secao.current?.animate([{ transform: 'perspective(1600px) rotateY(8deg)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  }, [mostradoId]);

  const mostrado = customs.find((d) => d.id === mostradoId) ?? die;
  if (!mostrado) return <section className="ficha-do-dado ficha-vazia" aria-label="Ficha do dado"><p>Forje um dado para vê-lo aqui.</p></section>;
  return (
    <section ref={secao} className="ficha-do-dado" aria-label={`Ficha de ${mostrado.name}`}>
      <JanelaDoDado kind={customKind(mostrado.id)} pulso={pulso} nome={mostrado.name} />
      <div className="ficha-campos" data-saindo={mostradoId !== die?.id} key={mostrado.id}>
        <Campos die={mostrado} aoMudar={() => setPulso((p) => p + 1)} />
      </div>
    </section>
  );
}
