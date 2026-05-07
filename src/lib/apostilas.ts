export type Apostila = { title: string; url: string };
export type Volume = { label: string; items: Apostila[] };
export type Serie = { name: string; volumes: Volume[] };
export type Categoria = { id: string; name: string; description: string; series: Serie[] };

const R2 = "https://pub-761ea6e47fa74db3a9b6ffc7656d8e73.r2.dev/OpenFuture";

export const CATEGORIAS: Categoria[] = [
  {
    id: "fundamental",
    name: "Ensino Fundamental",
    description: "6º ao 9º ano — Currículo SP",
    series: [
      {
        name: "6º Ano",
        volumes: [
          {
            label: "Volume 1",
            items: [
              { title: "Língua Portuguesa e Matemática", url: `${R2}/6ano/Livro%20do%20estudante%20Amarelo.pdf` },
              { title: "Ciências, História, Geografia, Inglês e Projeto de Vida", url: `${R2}/6ano/Livro%20do%20estudante%20Roxo.pdf` },
            ],
          },
          {
            label: "Volume 2",
            items: [
              { title: "Matemática e Língua Portuguesa", url: `${R2}/volume2/6ano/matematicaportugues6anovol2.pdf` },
              { title: "História, Ciências, Geografia, Inglês e Projeto de Vida", url: `${R2}/volume2/6ano/histciefeoinglprojeto6anovol2.pdf` },
            ],
          },
        ],
      },
      {
        name: "7º Ano",
        volumes: [
          {
            label: "Volume 1",
            items: [
              { title: "Língua Portuguesa e Matemática", url: `${R2}/7aano/1502147.pdf` },
              { title: "Ciências, História, Geografia, Inglês e Projeto de Vida", url: `${R2}/7aano/sla2.pdf` },
            ],
          },
          {
            label: "Volume 2",
            items: [
              { title: "História, Ciências, Geografia, Inglês e Projeto de Vida", url: `${R2}/volume2/7ano/histciengeoinglprojeto7anovol2.pdf` },
              { title: "Matemática e Língua Portuguesa", url: `${R2}/volume2/7ano/matematicaportugues7anovol2.pdf` },
            ],
          },
        ],
      },
      {
        name: "8º Ano",
        volumes: [
          {
            label: "Volume 1",
            items: [
              { title: "Língua Portuguesa e Matemática", url: `${R2}/8anno/1502156.pdf` },
              { title: "Ciências, História, Geografia, Inglês e Projeto de Vida", url: `${R2}/8anno/sla3.pdf` },
            ],
          },
          {
            label: "Volume 2",
            items: [
              { title: "História, Ciências, Geografia e Inglês", url: `${R2}/volume2/8ano/histciengeoing8anovol2.pdf` },
              { title: "Matemática, Língua Portuguesa e Projeto de Vida", url: `${R2}/volume2/8ano/matematicaportugues8anovol2.pdf` },
            ],
          },
        ],
      },
      {
        name: "9º Ano",
        volumes: [
          {
            label: "Volume 1",
            items: [
              { title: "Língua Portuguesa e Matemática", url: `${R2}/9anno/1502161.pdf` },
              { title: "Ciências, História, Geografia, Inglês e Projeto de Vida", url: `${R2}/9anno/sla1.pdf` },
            ],
          },
          {
            label: "Volume 2",
            items: [
              { title: "História, Ciências, Geografia, Inglês e Projeto de Vida", url: `${R2}/volume2/9ano/histciengeoinglprojeto9anovol2.pdf` },
              { title: "Matemática e Língua Portuguesa", url: `${R2}/volume2/9ano/matematicaportugues9anovol2.pdf` },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "medio",
    name: "Ensino Médio",
    description: "1º ao 3º ano EM — Currículo SP",
    series: [
      {
        name: "1º Ano EM",
        volumes: [
          {
            label: "Volume 1",
            items: [
              { title: "Língua Portuguesa e Matemática", url: `${R2}/1anoem/1499971.pdf` },
              { title: "Biologia, Física, Química, História, Geografia e Inglês", url: `${R2}/1anoem/1519510.pdf` },
            ],
          },
          {
            label: "Volume 2",
            items: [
              { title: "Física, Biologia e Química", url: `${R2}/volume2/1ano/fisbioloquim1ano2vol.pdf` },
              { title: "História, Geografia e Inglês", url: `${R2}/volume2/1ano/histgeoingl1anovol2.pdf` },
              { title: "Matemática", url: `${R2}/volume2/1ano/matematica1anovol2.pdf` },
            ],
          },
        ],
      },
      {
        name: "2º Ano EM",
        volumes: [
          {
            label: "Volume 1",
            items: [
              { title: "Língua Portuguesa e Matemática", url: `${R2}/2anoem/1499983.pdf` },
              { title: "Biologia, Física, Química, História, Geografia e Inglês", url: `${R2}/2anoem/1520452.pdf` },
            ],
          },
          {
            label: "Volume 2",
            items: [
              { title: "Física, Biologia e Química", url: `${R2}/volume2/2ano/fisbioquim2anovol2.pdf` },
              { title: "História, Geografia e Inglês", url: `${R2}/volume2/2ano/histgeoing2anovol2.pdf` },
              { title: "Matemática e Português", url: `${R2}/volume2/2ano/1607135%20(1).pdf` },
            ],
          },
        ],
      },
      {
        name: "3º Ano EM",
        volumes: [
          {
            label: "Volume 1",
            items: [
              { title: "Língua Portuguesa e Matemática", url: `${R2}/3anoem/1500111.pdf` },
              { title: "Biologia, Física, Química, História, Geografia e Inglês", url: `${R2}/3anoem/1520469.pdf` },
            ],
          },
          {
            label: "Volume 2",
            items: [
              { title: "História, Física e Inglês", url: `${R2}/volume2/3ano/histfisicaingl3anovol2.pdf` },
              { title: "Matemática e Português", url: `${R2}/volume2/3ano/matematicaportugues3anovol2.pdf` },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "spacao",
    name: "São Paulo em Ação",
    description: "Coleção SP em Ação",
    series: [
      {
        name: "Volume 1",
        volumes: [{ label: "Apostilas", items: [
          { title: "Matemática", url: `${R2}/SP1/livromatematica1.pdf` },
          { title: "Português", url: `${R2}/SP1/livro1.pdf` },
        ]}],
      },
      {
        name: "Volume 2",
        volumes: [{ label: "Apostilas", items: [
          { title: "Matemática", url: `${R2}/SP2/livromatematica2.pdf` },
          { title: "Português", url: `${R2}/SP2/livro2.pdf` },
        ]}],
      },
      {
        name: "Volume 3",
        volumes: [{ label: "Apostilas", items: [
          { title: "Português", url: `${R2}/SP3/livro3.pdf` },
          { title: "Matemática", url: `${R2}/SP3/livromatematica3.pdf` },
        ]}],
      },
    ],
  },
  {
    id: "modernaplus",
    name: "Moderna Plus",
    description: "Coleção Moderna Plus por disciplina",
    series: [
      { name: "Português", volumes: [{ label: "Volumes", items: [
        { title: "Volume 1", url: `${R2}/ModernaPlus/MODERNA-PLUS-Portugues-contexto-interlocucao-e-sentido-1-1.pdf` },
        { title: "Volume 2", url: `${R2}/ModernaPlus/MODERNA-PLUS-Portugues-contexto-interlocucao-e-sentido-2-1.pdf` },
        { title: "Volume 3", url: `${R2}/ModernaPlus/MODERNA-PLUS-Portugues-contexto-interlocucao-e-sentido-3-1.pdf` },
      ]}]},
      { name: "Matemática Paiva", volumes: [{ label: "Volumes", items: [
        { title: "Volume 1", url: `${R2}/ModernaPlus/Moderna-Plus-Matematica-Paiva-1-1.pdf` },
        { title: "Volume 2", url: `${R2}/ModernaPlus/Moderna-Plus-Matematica-Paiva-2-1.pdf` },
        { title: "Volume 3", url: `${R2}/ModernaPlus/Moderna-Plus-Matematica-Paiva-3-1.pdf` },
      ]}]},
      { name: "Arte", volumes: [{ label: "Apostila", items: [{ title: "Arte", url: `${R2}/ModernaPlus/MODERNA-PLUS-Arte-1.pdf` }]}]},
      { name: "Redação", volumes: [{ label: "Apostila", items: [{ title: "Redação", url: `${R2}/ModernaPlus/MODERNA-PLUS-Redacao-1.pdf` }]}]},
      { name: "Biologia", volumes: [{ label: "Apostila", items: [{ title: "Biologia (Amabis & Martho)", url: `${R2}/ModernaPlus/Moderna-Plus-Biologia-Amabis-Martho-1.pdf` }]}]},
      { name: "Educação Digital", volumes: [{ label: "Apostila", items: [{ title: "Educação Digital", url: `${R2}/ModernaPlus/Moderna-Plus-Educacao-Digital-1.pdf` }]}]},
      { name: "Espanhol", volumes: [{ label: "Apostila", items: [{ title: "Espanhol", url: `${R2}/ModernaPlus/Moderna-Plus-Espanhol-1.pdf` }]}]},
      { name: "Filosofia", volumes: [{ label: "Apostila", items: [{ title: "Filosofia", url: `${R2}/ModernaPlus/Moderna-Plus-Filosofia-1.pdf` }]}]},
      { name: "Física", volumes: [{ label: "Apostila", items: [{ title: "Física: Ciência e Tecnologia", url: `${R2}/ModernaPlus/Moderna-Plus-Fisica-Ciencia-e-Tecnologia-1.pdf` }]}]},
      { name: "Geografia", volumes: [{ label: "Apostila", items: [{ title: "Geografia", url: `${R2}/ModernaPlus/Moderna-Plus-Geografia-1.pdf` }]}]},
      { name: "História", volumes: [{ label: "Apostila", items: [{ title: "História", url: `${R2}/ModernaPlus/Moderna-Plus-Historia-1.pdf` }]}]},
      { name: "Inglês", volumes: [{ label: "Apostila", items: [{ title: "Inglês", url: `${R2}/ModernaPlus/Moderna-Plus-Ingles-1.pdf` }]}]},
      { name: "Química", volumes: [{ label: "Apostila", items: [{ title: "Química na Abordagem do Cotidiano", url: `${R2}/ModernaPlus/Moderna-Plus-Quimica-na-abordagem-do-cotidiano-1.pdf` }]}]},
      { name: "Sociologia", volumes: [{ label: "Apostila", items: [{ title: "Sociologia em Movimento", url: `${R2}/ModernaPlus/Moderna-Plus-Sociologia-em-movimento-1.pdf` }]}]},
    ],
  },
  {
    id: "modernaacao",
    name: "Moderna em Ação",
    description: "Coleção Moderna em Ação",
    series: [
      { name: "Matemática", volumes: [{ label: "Volumes", items: [
        { title: "Volume 1", url: `${R2}/ModernaEmA%C3%A7%C3%A3o/Moderna-em-ACAO-Matematica-1-1.pdf` },
        { title: "Volume 2", url: `${R2}/ModernaEmA%C3%A7%C3%A3o/Moderna-em-ACAO-Matematica-2-1.pdf` },
      ]}]},
      { name: "Português", volumes: [{ label: "Volumes", items: [
        { title: "Volume 1", url: `${R2}/ModernaEmA%C3%A7%C3%A3o/Moderna-Em-Acao-Portugues-1-1.pdf` },
        { title: "Volume 2", url: `${R2}/ModernaEmA%C3%A7%C3%A3o/Moderna-Em-Acao-Portugues-2-1.pdf` },
        { title: "Volume 3", url: `${R2}/ModernaEmA%C3%A7%C3%A3o/Moderna-Em-Acao-Portugues-3-1.pdf` },
      ]}]},
      { name: "Artes", volumes: [{ label: "Apostila", items: [{ title: "Artes", url: `${R2}/ModernaEmA%C3%A7%C3%A3o/Moderna-Em-Acao-Arte-1.pdf` }]}]},
      { name: "Inglês", volumes: [{ label: "Apostila", items: [{ title: "Inglês", url: `${R2}/ModernaEmA%C3%A7%C3%A3o/Moderna-em-Acao-Ingles-2.pdf` }]}]},
      { name: "Redação", volumes: [{ label: "Apostila", items: [{ title: "Redação", url: `${R2}/ModernaEmA%C3%A7%C3%A3o/Moderna-Em-Acao-Redacao-1.pdf` }]}]},
    ],
  },
  {
    id: "superacao",
    name: "SuperAção",
    description: "Coleção Moderna SuperAção",
    series: [
      { name: "Português (Ormundo)", volumes: [{ label: "Volumes", items: [
        { title: "Volume 1", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/MODERNA-SuperACAO-Portugues-Ormundo-Siniscalchi-1-1.pdf` },
        { title: "Volume 2", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/MODERNA-SuperACAO-Portugues-Ormundo-Siniscalchi-2-1.pdf` },
        { title: "Volume 3", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/MODERNA-SuperACAO-Portugues-Ormundo-Siniscalchi-3-1.pdf` },
      ]}]},
      { name: "Matemática", volumes: [{ label: "Volumes", items: [
        { title: "Volume 1", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/Moderna-SuperACAO-Matematica-1-1.pdf` },
        { title: "Volume 2", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/Moderna-SuperACAO-Matematica-2-1.pdf` },
      ]}]},
      { name: "Biologia", volumes: [{ label: "Apostila", items: [{ title: "Biologia", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/Moderna-SuperAcao-Biologia-1.pdf` }]}]},
      { name: "Química", volumes: [{ label: "Apostila", items: [{ title: "Química", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/Moderna-SuperAcao-Quimica-2.pdf` }]}]},
      { name: "Artes", volumes: [{ label: "Apostila", items: [{ title: "Artes", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/MODERNA-SuperACAO-Arte-Ormundo-Vilas-Boas-1.pdf` }]}]},
      { name: "Redação", volumes: [{ label: "Apostila", items: [{ title: "Redação", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/MODERNA-SuperACAO-Redacao-Ormundo-Siniscalchi-1.pdf` }]}]},
      { name: "Espanhol", volumes: [{ label: "Apostila", items: [{ title: "Espanhol", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/Moderna-SuperAcao-Espanhol-1.pdf` }]}]},
      { name: "Filosofia (Cotrim)", volumes: [{ label: "Apostila", items: [{ title: "Filosofia (Cotrim)", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/Moderna-SuperAcao-Filosofia-Cotrim-1.pdf` }]}]},
      { name: "Geografia", volumes: [{ label: "Apostila", items: [{ title: "Geografia", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/Moderna-SuperAcao-Geografia-1.pdf` }]}]},
      { name: "História", volumes: [{ label: "Apostila", items: [{ title: "História", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/Moderna-SuperAcao-Historia-1.pdf` }]}]},
      { name: "Sociologia", volumes: [{ label: "Apostila", items: [{ title: "Sociologia", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/Moderna-SuperAcao-Sociologia-1.pdf` }]}]},
      { name: "Educação Física", volumes: [{ label: "Apostila", items: [{ title: "Educação Física", url: `${R2}/ModernaSuperA%C3%A7%C3%A3o/Moderna-Superacao-Educacao-Fisica-1.pdf` }]}]},
    ],
  },
];
