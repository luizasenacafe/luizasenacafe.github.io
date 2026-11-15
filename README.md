# Portfólio de Luiza Sena

Portfólio pessoal publicado em https://luizasenacafe.github.io/ pelo GitHub Pages, a partir da raiz da branch `main`.

## Como funciona

São duas páginas: `index.html` é a página inicial (um botão para entrar no portfólio e outro para baixar o currículo) e `portfolio.html` é o portfólio.

O portfólio abre num sistema solar que serve de menu: cada planeta leva a uma seção (Sobre, Habilidades, Projetos, Experiência, Cursos, Certificados, YouTube e Contato). Também dá para rolar a página e visitar todas em ordem. Cada seção tem a cor do seu planeta, uma figura de partículas própria e fórmulas ligadas ao tema.

O fundo é um céu desenhado em WebGL, em três camadas: nebulosa com a faixa da Via Láctea, estrelas em várias profundidades e a figura de partículas da seção (estrela, galáxia, malha do espaço-tempo, átomo, DNA, atrator de Lorenz, tesserato, interferência de ondas e buraco negro). Ao rolar, a figura migra de uma forma para a seguinte. O cursor gira a figura, afasta as partículas e desloca o céu; um clique dispara uma onda.

Antes do contato há uma estrada: um carro acelera conforme a rolagem, de 60 km/h até perto da velocidade da luz, com as fórmulas do movimento nas placas. O mouse dirige.

## Edição

- `index.html`: página inicial.
- `portfolio.html`: todo o conteúdo (textos, projetos, experiências, formação e links). As fórmulas ao fundo são os `<p class="fm">` de cada seção.
- `assets/cosmos.css`: identidade visual, planetas e layout responsivo das duas páginas.
- `assets/cosmos.js`: céu, figuras, menu do sistema solar, estrada e efeitos de rolagem. `CHAPTERS` define figura, cores e posição de cada seção, na mesma ordem do HTML; `SHAPES` descreve como cada figura é construída.
- `assets/fonts/`: fontes servidas pelo próprio site (Instrument Serif, Instrument Sans e JetBrains Mono, licença SIL Open Font).

Não há dependências nem etapa de compilação. Para visualizar localmente, use um servidor HTTP na raiz do repositório, por exemplo `python -m http.server 8765`.

Sem WebGL, o fundo vira um gradiente estático. Com "reduzir movimento" ativado no sistema, as animações são desligadas e os projetos viram um carrossel comum.

O conteúdo profissional segue o currículo em `assets/curriculo-luiza-sena.pdf`. Datas previstas de conclusão devem ser revisadas quando houver mudanças.

Os arquivos `index-*.js`, `index-*.css`, `city-bg-*.jpg`, `luiza-avatar-*.jpeg` e os GIFs em `assets/` são de versões anteriores e não são mais usados pelo site.
