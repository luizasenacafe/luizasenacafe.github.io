# Portfólio de Luiza Sena

Portfólio pessoal publicado em https://luizasenacafe.github.io/ pelo GitHub Pages, a partir da raiz da branch `main`.

## Como funciona

São duas páginas: `index.html` é a página inicial (um botão para entrar no portfólio e outro para baixar o currículo) e `portfolio.html` é o portfólio, dividido em sete capítulos.

O fundo é um céu desenhado em WebGL, em três camadas: nebulosa com a faixa da Via Láctea, estrelas em várias profundidades e uma figura de partículas que muda a cada capítulo. As figuras são um planeta com anéis (página inicial), uma estrela, uma galáxia espiral barrada, a malha do espaço-tempo, um átomo, a dupla hélice do DNA, a interferência de duas ondas e um buraco negro com jatos. Ao rolar, a figura migra de uma forma para a seguinte e o céu desliza em paralaxe. O cursor gira a figura, afasta as partículas e desloca o céu; um clique dispara uma onda. A cor de destaque muda junto, do vermelho ao azul.

## Edição

- `index.html`: página inicial.
- `portfolio.html`: todo o conteúdo (textos, projetos, experiências, formação e links).
- `assets/cosmos.css`: identidade visual e layout responsivo das duas páginas.
- `assets/cosmos.js`: céu, figuras e efeitos de rolagem. `FIGURES` define cor, inclinação e posição de cada figura; `ORDER` diz quais aparecem em cada página, na mesma ordem das seções do HTML; `SHAPES` descreve como cada figura é construída.
- `assets/fonts/`: fontes servidas pelo próprio site (Instrument Serif, Instrument Sans e JetBrains Mono, licença SIL Open Font).

Não há dependências nem etapa de compilação. Para visualizar localmente, use um servidor HTTP na raiz do repositório, por exemplo `python -m http.server 8765`.

Sem WebGL, o fundo vira um gradiente estático. Com "reduzir movimento" ativado no sistema, as animações são desligadas e os projetos viram um carrossel comum.

O conteúdo profissional segue o currículo em `assets/curriculo-luiza-sena.pdf`. Datas previstas de conclusão devem ser revisadas quando houver mudanças.

Os arquivos `index-*.js`, `index-*.css`, `city-bg-*.jpg`, `luiza-avatar-*.jpeg` e os GIFs em `assets/` são de versões anteriores e não são mais usados pelo site.
