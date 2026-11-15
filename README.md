# Portfólio de Luiza Sena

Portfólio pessoal publicado em https://luizasenacafe.github.io/ pelo GitHub Pages, a partir da raiz da branch `main`.

## Como funciona

São duas páginas: `index.html` é a página inicial (um botão para entrar no portfólio e outro para baixar o currículo) e `portfolio.html` é o portfólio.

O portfólio tem cara de jogo. Ele abre numa seleção de fase em forma de sistema solar: cada planeta leva a uma seção (Sobre, Habilidades, Projetos, Experiência, Cursos, Certificados, YouTube e Contato), e dá para arrastar o sistema para girá-lo e incliná-lo. Também dá para rolar a página e passar por todas as fases em ordem. Cada fase tem a cor do seu planeta, uma figura de partículas própria e fórmulas ligadas ao tema. Os textos ficam soltos sobre o céu, sem caixas.

O fundo é um céu desenhado em WebGL, em três camadas: nebulosa com a faixa da Via Láctea, estrelas em várias profundidades e a figura de partículas da fase (estrela, galáxia, malha do espaço-tempo, átomo, DNA, atrator de Lorenz, tesserato, interferência de ondas e buraco negro). Ao rolar, a figura migra de uma forma para a seguinte. O cursor gira a figura, afasta as partículas e desloca o céu; um clique dispara uma onda.

No fim há uma fase bônus: um jogo de corrida em três faixas, de desviar de obstáculos e pegar cristais. Joga-se com o mouse, as setas (ou A e D) ou o toque. O recorde fica guardado no navegador.

## Edição

- `index.html`: página inicial.
- `portfolio.html`: todo o conteúdo (textos, projetos, experiências, formação e links). As fórmulas ao fundo são os `<p class="fm">` de cada seção.
- `assets/cosmos.css`: identidade visual, planetas e layout responsivo das duas páginas.
- `assets/cosmos.js`: céu, figuras, seleção de fase, efeitos de rolagem e o jogo. `CHAPTERS` define figura, cores e posição de cada fase, na mesma ordem do HTML; `SHAPES` descreve como cada figura é construída; o bloco "jogo" concentra as regras e o desenho da corrida.
- `assets/fonts/`: fontes servidas pelo próprio site (Chakra Petch, Press Start 2P, Instrument Sans e JetBrains Mono, licença SIL Open Font).

Não há dependências nem etapa de compilação. Para visualizar localmente, use um servidor HTTP na raiz do repositório, por exemplo `python -m http.server 8765`.

Sem WebGL, o fundo vira um gradiente estático. Com "reduzir movimento" ativado no sistema, as animações são desligadas e os projetos viram um carrossel comum.

O conteúdo profissional segue o currículo em `assets/curriculo-luiza-sena.pdf`. Datas previstas de conclusão devem ser revisadas quando houver mudanças.

Os arquivos `index-*.js`, `index-*.css`, `city-bg-*.jpg`, `luiza-avatar-*.jpeg` e os GIFs em `assets/` são de versões anteriores e não são mais usados pelo site.
