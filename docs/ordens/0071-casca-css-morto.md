# Ordem de serviço: limpeza da auditoria, casca

Ordem: OS-0071 (limpeza da auditoria, [docs/limpeza-auditoria.md](../limpeza-auditoria.md))
Módulo: nenhum, só a casca
Escopo de escrita:
- `src/index.css`

Objetivo:
- Apagar o CSS que o livro (OS-0052 a 0055) sobrescreve por inteiro e juntar os blocos repetidos, **sem mudar um pixel**.

Antes de começar, leia [docs/limpeza-auditoria.md](../limpeza-auditoria.md) (as regras comuns) e as seções de [docs/auditoria-codigo.md](../auditoria-codigo.md) citadas abaixo.

Decisões do orquestrador:

1. **Auditoria 1.1, linha a linha:**
   - `.pool` (l.55);
   - `.chat-log .msg-you/.msg-app/[data-error]/.hint` (l.108-111);
   - o bloco duplicado `.table-list li` (l.237-238; fica a versão de l.154-155 **só se** a especificidade for a mesma; senão fica a mais específica e sai a outra);
   - `.selection` sem efeito (l.52 e o `flex` mobile da l.83; **fica** o `.selection button` mobile da l.84);
   - `.import { width }` (l.121; **fica** o `overflow-y`);
   - as propriedades mortas de `.import-drop`, `.import-preview`, `.import-error` e `.import-choice button.primary` (l.123-126, 131, 144). É cirurgia: só a propriedade sobrescrita sai, e a regra fica com o que ainda vale;
   - `.table-row select` (l.152, **fica** o `border-radius`);
   - o token `--wine` (l.22).
   - Os números de linha são da auditoria e podem ter andado: ache pelo seletor.
2. **O bloco `.chat` antigo (l.98-104 e 115):** saem `position`, `top`, `right`, `bottom`, `width`, `transform`, `box-shadow`, `border-left`, `visibility`, `transition`, o `.chat[data-open="true"]`, o `.chat h2` e o `prefers-reduced-motion` do `.chat`.
   - **Ficam** o `gap: 12px` e o `z-index: 10`: as OS-0067 e 0069 contam com o 10.
3. **Auditoria 2.3:**
   - os dois `.import-body` iguais de `#table-panel` e `#meus-dados` viram um seletor `:is()`;
   - os `grid-template-rows: auto 1fr` e `header { display: contents }` repetidos, também.
4. **Cores literais repetidas:**
   - `#786958` vira o token `--traco` em `:root`;
   - `#f6ecd6` vira `--papel-claro`;
   - a troca é só de nome, com o mesmo valor. O resto da lista fica.
5. **Sem mexer** nos blocos das OS-0056 a 0069: ritmo, perfil, reações, folhear, véu e o ×.

Critérios de aceite:
- `git diff --stat` só no escopo de escrita.
- O gate do dev passa (regra 8 das regras comuns): `npm run build && npm run lint && npm test`.
- O relatório final traz o hash, os arquivos, o gate, cada item feito e cada item mantido, com o porquê (consumidor achado, teste que precisa, risco de comportamento).
- **Sem E2E nem servidor de dev.** O orquestrador roda o E2E completo no fim da limpeza.

Se precisar de algo fora disso: pare e reporte. Não implemente.
