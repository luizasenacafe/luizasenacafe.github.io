# Portfólio de Luiza Sena

Portfólio pessoal publicado em https://luizasenacafe.github.io/ pelo GitHub Pages, a partir da raiz da branch `main`.

## Como funciona

A página é uma só (`index.html`), dividida em sete capítulos. Um fundo fixo de partículas em WebGL assume uma forma por capítulo (estrela, galáxia, malha do espaço-tempo, nó, hélice, onda e buraco negro) e migra de uma para a outra conforme a rolagem. O cursor gira a cena e afasta as partículas; um clique dispara uma onda. A cor de destaque muda junto, do vermelho ao azul.

## Edição

- `index.html`: todo o conteúdo (textos, projetos, experiências, formação e links).
- `assets/cosmos.css`: identidade visual e layout responsivo.
- `assets/cosmos.js`: partículas e efeitos de rolagem. A lista `CHAPTERS` no topo define forma, cor e posição de cada capítulo, na mesma ordem das seções do HTML.
- `assets/fonts/`: fontes servidas pelo próprio site (Instrument Serif, Instrument Sans e JetBrains Mono, licença SIL Open Font).
- `portfolio.html`: apenas redireciona links antigos para a página principal.

Não há dependências nem etapa de compilação. Para visualizar localmente, use um servidor HTTP na raiz do repositório, por exemplo `python -m http.server 8765`.

Sem WebGL, o fundo vira um gradiente estático. Com "reduzir movimento" ativado no sistema, as animações são desligadas e os projetos viram um carrossel comum.

O conteúdo profissional segue o currículo em `assets/curriculo-luiza-sena.pdf`. Datas previstas de conclusão devem ser revisadas quando houver mudanças.

Os arquivos `index-*.js`, `index-*.css`, `city-bg-*.jpg`, `luiza-avatar-*.jpeg` e os GIFs em `assets/` são de versões anteriores e não são mais usados pelo site.
