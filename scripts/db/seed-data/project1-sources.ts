import type { SeedProjectConfig } from './types'

export const project1Config: SeedProjectConfig = {
  projects: [
    {
      key: 'p1-main',
      name: 'Post-Labor Economy & Digital Commons',
      description:
        'Comprehensive bibliography exploring post-work futures, universal basic income, degrowth economics, digital platform capitalism, commons-based governance, mechanism design, and well-being measurement beyond GDP.',
      color: '#4F46E5',
      isStarred: true,
    },
    {
      key: 'p1-mechanism',
      name: 'Mechanism Design Reading Group',
      description:
        'Focused reading on digital capitalism, platform cooperativism, radical markets, and blockchain-based governance mechanisms.',
      color: '#059669',
    },
    {
      key: 'p1-archived',
      name: 'Archived: Initial Literature Survey',
      description:
        'Early-stage literature survey that has been superseded by the main project bibliography.',
      color: '#6B7280',
      isArchived: true,
    },
  ],

  tags: [
    {
      key: 'automation',
      name: 'Post-Work & Automation',
      color: '#EF4444',
      description:
        'Sources on technological unemployment, AI-driven labor displacement, and post-work futures',
    },
    {
      key: 'basic-income',
      name: 'Basic Income & Welfare Redesign',
      color: '#F59E0B',
      description:
        'UBI experiments, cash transfers, universal basic services, job guarantees, and MMT',
    },
    {
      key: 'degrowth',
      name: 'Post-Growth & Degrowth',
      color: '#10B981',
      description:
        'Steady-state economics, doughnut economics, planetary boundaries, and degrowth theory',
    },
    {
      key: 'commons',
      name: 'Commons & Cooperative Ownership',
      color: '#3B82F6',
      description:
        'Commons governance, platform cooperativism, peer production, and shared resource management',
    },
    {
      key: 'digital',
      name: 'Digital Capitalism & Data Value',
      color: '#8B5CF6',
      description:
        'Surveillance capitalism, platform economics, data-as-labor, and digital value extraction',
    },
    {
      key: 'mechanism',
      name: 'Mechanism Design & New Rules',
      color: '#EC4899',
      description:
        'Radical markets, quadratic funding, blockchain governance, and institutional innovation',
    },
    {
      key: 'wellbeing',
      name: 'Well-Being & Beyond-GDP',
      color: '#F97316',
      description:
        'Happiness economics, capability approach, HDI, and alternative progress metrics',
    },
  ],

  entries: [
    // ============================================================
    // GROUP A: Post-work, automation, "labor becomes optional" (12)
    // ============================================================
    {
      entryType: 'journal_article',
      title: 'Robots and Jobs: Evidence from US Labor Markets',
      authors: [
        { firstName: 'Daron', lastName: 'Acemoglu' },
        { firstName: 'Pascual', lastName: 'Restrepo' },
      ],
      year: 2020,
      metadata: {
        doi: '10.1086/705716',
        journal: 'Journal of Political Economy',
        volume: '128',
        issue: '6',
        pages: '2188-2244',
        publisher: 'University of Chicago Press',
      },
      isFavorite: true,
      tagKey: 'automation',
      annotation: {
        content:
          'Acemoglu and Restrepo provide the first large-scale empirical analysis of how industrial robots affect U.S. local labor markets, finding that each additional robot per thousand workers reduces the employment-to-population ratio by 0.2 percentage points and wages by 0.42%. The study distinguishes between displacement and productivity effects, showing that in commuting zones with higher robot exposure, displacement dominates. This paper is foundational for any empirical argument about automation-driven job loss.',
        type: 'summary',
      },
      veritasScore: {
        overallScore: 92,
        confidence: 0.93,
        label: 'exceptional',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 95,
            weight: 0.2,
            evidence: 'Journal of Political Economy is a top-5 economics journal',
            source: 'Semantic Scholar',
          },
          {
            name: 'Peer Review',
            score: 95,
            weight: 0.2,
            evidence: 'Rigorous peer review at JPE',
            source: 'CrossRef',
          },
          {
            name: 'Author Credentials',
            score: 90,
            weight: 0.2,
            evidence: 'Acemoglu is Institute Professor at MIT; Restrepo at Boston University',
            source: 'OpenAlex',
          },
          {
            name: 'Citation Impact',
            score: 93,
            weight: 0.2,
            evidence: 'Over 4000 citations since publication',
            source: 'Semantic Scholar',
          },
          {
            name: 'Methodology',
            score: 88,
            weight: 0.2,
            evidence: 'Instrumental variable strategy using European robot adoption patterns',
            source: 'Semantic Scholar',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'journal_article',
      title: 'Why Are There Still So Many Jobs? The History and Future of Workplace Automation',
      authors: [{ firstName: 'David', middleName: 'H.', lastName: 'Autor' }],
      year: 2015,
      metadata: {
        doi: '10.1257/jep.29.3.3',
        journal: 'Journal of Economic Perspectives',
        volume: '29',
        issue: '3',
        pages: '3-30',
        publisher: 'American Economic Association',
      },
      tagKey: 'automation',
      notes:
        'Key counterpoint to full-automation narratives. Autor argues tasks requiring flexibility, judgment, and common sense remain resistant to automation. Important for framing the "partial automation" thesis.',
      annotation: {
        content:
          'Autor surveys two centuries of automation anxiety and argues that while technology substitutes for labor in routine tasks, it also complements labor in non-routine tasks requiring problem-solving, adaptability, and creativity. He introduces the task-based framework showing that automation rarely eliminates entire occupations but instead reshapes the bundle of tasks workers perform. The paper challenges simplistic predictions of mass technological unemployment while acknowledging that automation does polarize the labor market.',
        type: 'critical',
      },
      veritasScore: {
        overallScore: 90,
        confidence: 0.91,
        label: 'exceptional',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 92,
            weight: 0.2,
            evidence: 'JEP is the leading survey journal in economics',
            source: 'Semantic Scholar',
          },
          {
            name: 'Peer Review',
            score: 90,
            weight: 0.2,
            evidence: 'Invited review article with editorial oversight',
            source: 'CrossRef',
          },
          {
            name: 'Author Credentials',
            score: 93,
            weight: 0.2,
            evidence: 'David Autor is Ford Professor at MIT, leading labor economist',
            source: 'OpenAlex',
          },
          {
            name: 'Citation Impact',
            score: 91,
            weight: 0.2,
            evidence: 'Over 3500 citations; widely assigned in graduate courses',
            source: 'Semantic Scholar',
          },
          {
            name: 'Currency',
            score: 85,
            weight: 0.2,
            evidence: 'Published 2015; remains highly relevant but predates GPT-era AI',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'journal_article',
      title: 'The Future of Employment: How Susceptible Are Jobs to Computerisation?',
      authors: [
        { firstName: 'Carl', middleName: 'Benedikt', lastName: 'Frey' },
        { firstName: 'Michael', middleName: 'A.', lastName: 'Osborne' },
      ],
      year: 2017,
      metadata: {
        doi: '10.1016/j.techfore.2016.08.019',
        journal: 'Technological Forecasting and Social Change',
        volume: '114',
        pages: '254-280',
        publisher: 'Elsevier',
      },
      isFavorite: true,
      tagKey: 'automation',
      customFields: { 'Reading Status': 'completed', 'Research Theme': 'post-labor' },
      annotation: {
        content:
          'Frey and Osborne classify 702 occupations by their susceptibility to computerization using a novel methodology that combines expert assessment with machine learning. Their headline finding—that 47% of U.S. employment is at high risk of automation—became one of the most cited statistics in public debates about the future of work. While subsequent studies have critiqued the occupation-level (vs. task-level) approach, the paper remains a landmark for quantifying automation risk at scale.',
        type: 'summary',
      },
      veritasScore: {
        overallScore: 82,
        confidence: 0.85,
        label: 'high',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 78,
            weight: 0.2,
            evidence: 'TFSC is a solid but not top-tier journal',
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 96,
            weight: 0.25,
            evidence: 'Over 10,000 citations; one of the most-cited papers on automation',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 82,
            weight: 0.2,
            evidence:
              'Frey directs Oxford Future of Work programme; Osborne is ML professor at Oxford',
            source: 'OpenAlex',
          },
          {
            name: 'Methodology',
            score: 72,
            weight: 0.2,
            evidence:
              'Occupation-level analysis criticized for overstating risk; task-level approaches preferred',
            source: 'Semantic Scholar',
          },
          {
            name: 'Currency',
            score: 80,
            weight: 0.15,
            evidence: 'Pre-LLM analysis; methodology still debated but foundational',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'journal_article',
      title: 'The Skill Content of Recent Technological Change: An Empirical Exploration',
      authors: [
        { firstName: 'David', middleName: 'H.', lastName: 'Autor' },
        { firstName: 'Frank', lastName: 'Levy' },
        { firstName: 'Richard', middleName: 'J.', lastName: 'Murnane' },
      ],
      year: 2003,
      metadata: {
        doi: '10.1162/003355303322552801',
        journal: 'Quarterly Journal of Economics',
        volume: '118',
        issue: '4',
        pages: '1279-1333',
        publisher: 'MIT Press',
      },
      tagKey: 'automation',
      extraProjectKeys: ['p1-archived'],
      annotation: {
        content:
          'This paper introduced the now-standard distinction between routine and non-routine tasks to explain how computerization reshapes labor demand. Autor, Levy, and Murnane show that computers substitute for workers performing routine cognitive and manual tasks while complementing workers engaged in non-routine analytic and interactive tasks. The "ALM framework" remains the dominant theoretical lens through which economists analyze technology and employment.',
        type: 'evaluative',
      },
      veritasScore: {
        overallScore: 95,
        confidence: 0.95,
        label: 'exceptional',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 97,
            weight: 0.2,
            evidence: 'QJE is a top-3 economics journal',
            source: 'Semantic Scholar',
          },
          {
            name: 'Peer Review',
            score: 95,
            weight: 0.2,
            evidence: 'Rigorous QJE review process',
            source: 'CrossRef',
          },
          {
            name: 'Citation Impact',
            score: 97,
            weight: 0.2,
            evidence: 'Over 6000 citations; defined an entire research agenda',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 95,
            weight: 0.2,
            evidence: 'Three leading labor economists at MIT and Harvard',
            source: 'OpenAlex',
          },
          {
            name: 'Methodology',
            score: 90,
            weight: 0.2,
            evidence: 'Novel task-based empirical framework using DOT occupation descriptions',
            source: 'Semantic Scholar',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'book',
      title:
        'Artificial Intelligence and Its Implications for Income Distribution and Unemployment',
      authors: [
        { firstName: 'Anton', lastName: 'Korinek' },
        { firstName: 'Joseph', middleName: 'E.', lastName: 'Stiglitz' },
      ],
      year: 2019,
      metadata: {
        publisher: 'University of Chicago Press',
        editor: 'Agrawal, A., Gans, J., & Goldfarb, A.',
        container: 'The Economics of Artificial Intelligence: An Agenda',
      },
      tagKey: 'automation',
      annotation: {
        content:
          'Korinek and Stiglitz model how advances in AI could lead to growing inequality and even immiseration of workers who lack complementary skills. They argue that standard economic models understate the risks because they assume smooth factor substitution, whereas AI may create winner-take-all dynamics. The chapter makes a case for proactive redistribution policies rather than relying on market adjustments to correct AI-driven displacement.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title:
        'The Second Machine Age: Work, Progress, and Prosperity in a Time of Brilliant Technologies',
      authors: [
        { firstName: 'Erik', lastName: 'Brynjolfsson' },
        { firstName: 'Andrew', lastName: 'McAfee' },
      ],
      year: 2014,
      metadata: { isbn: '9780393239355', publisher: 'W. W. Norton' },
      isFavorite: true,
      tagKey: 'automation',
      notes:
        'Accessible introduction to the automation debate. Pairs well with Frey & Osborne for the "high automation risk" perspective, and with Autor (2015) for the counterargument.',
      annotation: {
        content:
          'Brynjolfsson and McAfee argue that digital technologies are entering a "second machine age" characterized by exponential improvement, digital replication at zero marginal cost, and recombinant innovation. They contend this will bring extraordinary economic bounty but also unprecedented inequality unless institutions adapt. The book popularized the concept of the "great decoupling" between productivity growth and median income growth.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title: 'A World Without Work: Technology, Automation, and How We Should Respond',
      authors: [{ firstName: 'Daniel', lastName: 'Susskind' }],
      year: 2020,
      metadata: { publisher: 'Metropolitan Books / Allen Lane' },
      tagKey: 'automation',
      annotation: {
        content:
          'Susskind challenges the "complementarity" assumption that human workers will always find new tasks as machines take over old ones. Drawing on advances in machine learning, he argues that AI increasingly encroaches on non-routine tasks, making the standard economic reassurance less reliable. The book proposes a "Big State" response centered on conditional basic income and a rethinking of the social contract beyond employment.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'book',
      title: 'Inventing the Future: Postcapitalism and a World Without Work',
      authors: [
        { firstName: 'Nick', lastName: 'Srnicek' },
        { firstName: 'Alex', lastName: 'Williams' },
      ],
      year: 2015,
      metadata: { publisher: 'Verso' },
      tagKey: 'automation',
      extraProjectKeys: ['p1-archived'],
      annotation: {
        content:
          'Srnicek and Williams present a left-accelerationist manifesto arguing that the left should embrace automation rather than resist it, and couple full automation with universal basic income, reduced work time, and a diminished work ethic. They critique "folk politics"—localist, small-scale, and reactive strategies—in favor of a counter-hegemonic project to reshape the global economy around post-work values.',
        type: 'reflective',
      },
    },
    {
      entryType: 'book',
      title: 'Bullshit Jobs: A Theory',
      authors: [{ firstName: 'David', lastName: 'Graeber' }],
      year: 2018,
      metadata: { publisher: 'Simon & Schuster' },
      tagKey: 'automation',
      notes:
        'Provocative cultural critique of meaningless work. Useful for the "why do we work?" framing rather than the economic analysis of automation.',
      annotation: {
        content:
          'Graeber argues that a significant and growing share of jobs in affluent economies are subjectively meaningless to the workers performing them—"bullshit jobs" that exist primarily to maintain managerial hierarchies, feed bureaucratic processes, or create an illusion of productivity. Drawing on survey data and worker testimony, he contends this represents a profound spiritual and psychological violence. The book challenges the assumption that labor markets efficiently allocate human effort.',
        type: 'critical',
      },
    },
    {
      entryType: 'book',
      title: 'Fully Automated Luxury Communism: A Manifesto',
      authors: [{ firstName: 'Aaron', lastName: 'Bastani' }],
      year: 2019,
      metadata: { publisher: 'Verso' },
      tagKey: 'automation',
      annotation: {
        content:
          'Bastani presents an optimistic vision in which converging technological disruptions—automation, solar energy, asteroid mining, synthetic biology, and gene editing—could create material abundance sufficient to eliminate scarcity. He argues that the political challenge is not technological but distributional: ensuring these gains are shared rather than privately captured. The book is more manifesto than rigorous analysis, but it usefully crystallizes the "post-scarcity" imagination.',
        type: 'critical',
      },
    },
    {
      entryType: 'report',
      title: 'World Development Report 2019: The Changing Nature of Work',
      authors: [],
      year: 2019,
      metadata: {
        doi: '10.1596/978-1-4648-1328-3',
        publisher: 'World Bank',
        url: 'https://www.worldbank.org/en/publication/wdr2019',
      },
      tagKey: 'automation',
      extraProjectKeys: ['p1-archived'],
      annotation: {
        content:
          'This World Bank flagship report assesses how technology is reshaping labor markets globally, with particular attention to developing countries. It argues that fears of mass unemployment from automation are overstated but that the nature of work is indeed changing, requiring investments in human capital, social protection, and regulatory reform. The report notably calls for a "new social contract" that includes universal basic social protections.',
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title: 'The Work of the Future: Building Better Jobs in an Age of Intelligent Machines',
      authors: [
        { firstName: 'David', middleName: 'H.', lastName: 'Autor' },
        { firstName: 'David', middleName: 'A.', lastName: 'Mindell' },
        { firstName: 'Elisabeth', middleName: 'B.', lastName: 'Reynolds' },
      ],
      year: 2020,
      metadata: {
        publisher: 'MIT Press / MIT Task Force on the Work of the Future',
        url: 'https://workofthefuture.mit.edu/',
      },
      tagKey: 'automation',
      annotation: {
        content:
          'The MIT Task Force concludes that the primary challenge is not mass unemployment from automation but rather the erosion of job quality and rising inequality. The report emphasizes that technology creates new work even as it eliminates old tasks, but that institutional failures—declining unions, eroded minimum wages, fissured workplaces—mean the gains from innovation are not widely shared. It calls for updated labor market institutions rather than assuming markets will self-correct.',
        type: 'evaluative',
      },
    },

    // ============================================================
    // GROUP B: Basic income, cash transfers, UBS, job guarantee (13)
    // ============================================================
    {
      entryType: 'book',
      title: 'Basic Income: A Radical Proposal for a Free Society and a Sane Economy',
      authors: [
        { firstName: 'Philippe', lastName: 'Van Parijs' },
        { firstName: 'Yannick', lastName: 'Vanderborght' },
      ],
      year: 2017,
      metadata: { publisher: 'Harvard University Press' },
      isFavorite: true,
      tagKey: 'basic-income',
      customFields: { 'Reading Status': 'completed', Priority: 'high' },
      annotation: {
        content:
          'Van Parijs and Vanderborght provide the most comprehensive philosophical and economic defense of unconditional basic income, tracing its intellectual history from Thomas Paine to contemporary pilots. They argue UBI is justified on grounds of real freedom—the freedom to do what one might wish to do—and address objections regarding affordability, work incentives, and political feasibility. This is the definitive academic reference on UBI theory.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title: 'Basic Income: And How We Can Make It Happen',
      authors: [{ firstName: 'Guy', lastName: 'Standing' }],
      year: 2017,
      metadata: { publisher: 'Pelican / Penguin' },
      tagKey: 'basic-income',
      annotation: {
        content:
          'Standing argues that globalization and the rise of the "precariat"—a new class defined by insecurity—make basic income both economically necessary and politically urgent. He emphasizes that UBI would provide economic security as a right, not charity, and would recognize the value of unpaid care work, community participation, and ecological stewardship. The book is accessible and policy-oriented, aimed at building a broad coalition for UBI.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'book',
      title: 'Basic Income: An Anthology of Contemporary Research',
      authors: [
        { firstName: 'Karl', lastName: 'Widerquist' },
        { firstName: 'José', middleName: 'A.', lastName: 'Noguera' },
        { firstName: 'Yannick', lastName: 'Vanderborght' },
        { firstName: 'Jurgen', lastName: 'De Wispelaere' },
      ],
      year: 2013,
      metadata: { publisher: 'Wiley-Blackwell' },
      tagKey: 'basic-income',
      annotation: {
        content:
          'This anthology collects key theoretical and empirical contributions to the basic income debate, spanning philosophy, economics, political science, and social policy. It serves as a comprehensive reference for researchers entering the field, covering justifications, criticisms, design questions, and case studies from negative income tax experiments to contemporary proposals.',
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title: 'The Basic Income Experiment 2017–2018 in Finland: Preliminary Results',
      authors: [
        { firstName: 'Olli', lastName: 'Kangas' },
        { firstName: 'Signe', lastName: 'Jauhiainen' },
        { firstName: 'Miska', lastName: 'Simanainen' },
        { firstName: 'Minna', lastName: 'Ylikännö' },
      ],
      year: 2019,
      metadata: {
        publisher: 'Finnish Ministry of Social Affairs and Health',
        url: 'https://julkaisut.valtioneuvosto.fi/handle/10024/161361',
      },
      isFavorite: true,
      tagKey: 'basic-income',
      notes:
        'The only national-level randomized UBI experiment in a developed country. Modest employment effects but significant well-being gains. Essential empirical reference.',
      annotation: {
        content:
          "This Finnish government report presents results from the world's first nationally randomized basic income experiment, in which 2,000 unemployed individuals received €560/month unconditionally for two years. The experiment found modest positive employment effects and significantly improved subjective well-being, life satisfaction, and trust in institutions among recipients. The study's methodological rigor makes it a cornerstone reference for evidence-based UBI policy.",
        type: 'summary',
      },
      veritasScore: {
        overallScore: 85,
        confidence: 0.88,
        label: 'high',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 82,
            weight: 0.2,
            evidence: 'Official Finnish government publication',
            source: 'CrossRef',
          },
          {
            name: 'Methodology',
            score: 88,
            weight: 0.25,
            evidence: 'Nationally randomized controlled trial with 2000 participants',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 80,
            weight: 0.2,
            evidence:
              'Kangas led the experiment as research director at Kela (Finnish Social Insurance)',
            source: 'OpenAlex',
          },
          {
            name: 'Transparency',
            score: 90,
            weight: 0.2,
            evidence: 'Full methodology and data publicly available',
            source: 'CrossRef',
          },
          {
            name: 'Currency',
            score: 85,
            weight: 0.15,
            evidence: 'Published 2019; final results confirmed preliminary findings',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef'],
      },
    },
    {
      entryType: 'journal_article',
      title:
        'The Short-term Impact of Unconditional Cash Transfers to the Poor: Experimental Evidence from Kenya',
      authors: [
        { firstName: 'Johannes', lastName: 'Haushofer' },
        { firstName: 'Jeremy', lastName: 'Shapiro' },
      ],
      year: 2016,
      metadata: {
        journal: 'Quarterly Journal of Economics',
        volume: '131',
        issue: '4',
        pages: '1973-2042',
        publisher: 'MIT Press',
      },
      tagKey: 'basic-income',
      annotation: {
        content:
          'Haushofer and Shapiro report results from a randomized evaluation of GiveDirectly\'s unconditional cash transfer program in rural Kenya. Large transfers ($1,525 PPP) increased consumption, assets, and psychological well-being while reducing cortisol levels (a biomarker of stress). The study provides rigorous evidence that poor households invest cash productively and do not increase spending on "temptation goods," challenging paternalistic objections to unconditional transfers.',
        type: 'summary',
      },
      veritasScore: {
        overallScore: 91,
        confidence: 0.92,
        label: 'exceptional',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 97,
            weight: 0.2,
            evidence: 'QJE is a top-3 economics journal',
            source: 'Semantic Scholar',
          },
          {
            name: 'Methodology',
            score: 92,
            weight: 0.25,
            evidence: 'Randomized controlled trial with biomarker data',
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 88,
            weight: 0.2,
            evidence: 'Over 1500 citations; foundational for cash transfer literature',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 85,
            weight: 0.2,
            evidence: 'Haushofer at Stockholm University; Shapiro at Busara Center',
            source: 'OpenAlex',
          },
          {
            name: 'Transparency',
            score: 90,
            weight: 0.15,
            evidence: 'Pre-registered; data publicly available',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'journal_article',
      title:
        'The Labor Market Impacts of Universal and Permanent Cash Transfers: Evidence from the Alaska Permanent Fund',
      authors: [
        { firstName: 'Damon', lastName: 'Jones' },
        { firstName: 'Ioana', lastName: 'Marinescu' },
      ],
      year: 2022,
      metadata: {
        doi: '10.1257/pol.20190299',
        journal: 'American Economic Journal: Economic Policy',
        volume: '14',
        issue: '2',
        pages: '315-340',
        publisher: 'American Economic Association',
      },
      tagKey: 'basic-income',
      annotation: {
        content:
          "Jones and Marinescu exploit the Alaska Permanent Fund Dividend—an annual universal cash payment to all state residents since 1982—as a natural experiment for studying UBI's labor market effects. They find no significant reduction in aggregate employment, though part-time work increased modestly. This is among the most credible studies of a real-world universal cash transfer's long-run employment effects.",
        type: 'summary',
      },
      veritasScore: {
        overallScore: 88,
        confidence: 0.9,
        label: 'high',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 88,
            weight: 0.2,
            evidence: 'AEJ: Economic Policy is a top field journal',
            source: 'Semantic Scholar',
          },
          {
            name: 'Methodology',
            score: 90,
            weight: 0.25,
            evidence: 'Synthetic control and difference-in-differences with long time series',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 85,
            weight: 0.2,
            evidence: 'Jones at U Chicago Harris; Marinescu at U Penn',
            source: 'OpenAlex',
          },
          {
            name: 'Citation Impact',
            score: 82,
            weight: 0.2,
            evidence: 'Key reference for real-world UBI evidence',
            source: 'Semantic Scholar',
          },
          {
            name: 'Currency',
            score: 90,
            weight: 0.15,
            evidence: 'Published 2022; most recent rigorous UBI study',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'report',
      title: 'Universal Basic Income in the Developing World',
      authors: [
        { firstName: 'Abhijit', lastName: 'Banerjee' },
        { firstName: 'Paul', lastName: 'Niehaus' },
        { firstName: 'Tavneet', lastName: 'Suri' },
      ],
      year: 2019,
      metadata: { publisher: 'National Bureau of Economic Research', series: 'NBER Working Paper' },
      tagKey: 'basic-income',
      annotation: {
        content:
          "Banerjee, Niehaus, and Suri survey the growing body of evidence on cash transfers in developing countries and assess the feasibility of universal basic income in low-income settings. They conclude that while targeted transfers may be more cost-effective, the administrative simplicity and dignity of universality have substantial value. The paper is notable for Nobel laureate Banerjee's engagement with the UBI debate from a development economics perspective.",
        type: 'evaluative',
      },
    },
    {
      entryType: 'book',
      title: 'The Case for Universal Basic Services',
      authors: [
        { firstName: 'Anna', lastName: 'Coote' },
        { firstName: 'Andrew', lastName: 'Percy' },
      ],
      year: 2020,
      metadata: { isbn: '9781509539840', publisher: 'Polity Press' },
      tagKey: 'basic-income',
      notes:
        'Important alternative to UBI: providing free public services (housing, transport, food, internet) rather than cash. Worth comparing to Van Parijs for the UBI-vs-UBS debate.',
      annotation: {
        content:
          'Coote and Percy argue that Universal Basic Services—publicly funded, collectively provided essentials like healthcare, education, housing, transport, and digital access—are a more effective route to social security than Universal Basic Income. They contend that UBS addresses needs directly, generates economies of scale, reduces ecological footprint, and strengthens social solidarity in ways that individualized cash payments cannot.',
        type: 'critical',
      },
    },
    {
      entryType: 'book',
      title: 'The Case for a Job Guarantee',
      authors: [{ firstName: 'Pavlina', middleName: 'R.', lastName: 'Tcherneva' }],
      year: 2020,
      metadata: { publisher: 'Polity Press' },
      tagKey: 'basic-income',
      annotation: {
        content:
          'Tcherneva makes the case for a federal job guarantee as an alternative to basic income, arguing that employment provides not just income but purpose, social connection, and macroeconomic stability. Drawing on Modern Monetary Theory, she proposes that the government act as employer of last resort, offering living-wage public service jobs to anyone willing to work. The book is a concise introduction to the JG as a structural policy alternative to UBI.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'book',
      title: 'Stabilizing an Unstable Economy',
      authors: [{ firstName: 'Hyman', middleName: 'P.', lastName: 'Minsky' }],
      year: 1986,
      metadata: { publisher: 'Yale University Press' },
      tagKey: 'basic-income',
      extraProjectKeys: ['p1-archived'],
      annotation: {
        content:
          'Minsky\'s magnum opus argues that financial instability is endogenous to capitalist economies: periods of stability encourage increasingly speculative finance, leading inevitably to crisis. He proposed an employer-of-last-resort program as a stabilizing institution. Though written decades before the 2008 crisis, the "Minsky moment" concept and his proposals for institutional reform are foundational to Modern Monetary Theory and the job guarantee literature.',
        type: 'reflective',
      },
    },
    {
      entryType: 'book',
      title: "The Deficit Myth: Modern Monetary Theory and the Birth of the People's Economy",
      authors: [{ firstName: 'Stephanie', lastName: 'Kelton' }],
      year: 2020,
      metadata: { isbn: '9781541736191', publisher: 'PublicAffairs' },
      tagKey: 'basic-income',
      annotation: {
        content:
          'Kelton, a leading proponent of Modern Monetary Theory, argues that sovereign currency-issuing governments are not constrained by revenue in the way households are, and that the real constraints on spending are inflation and real resources. She reframes the deficit debate and argues this understanding opens fiscal space for ambitious programs like a job guarantee, green new deal, and universal healthcare. The book popularized MMT for a general audience.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title: 'Modern Money Theory: A Primer on Macroeconomics for Sovereign Monetary Systems',
      authors: [{ firstName: 'L.', middleName: 'Randall', lastName: 'Wray' }],
      year: 2015,
      metadata: { publisher: 'Palgrave Macmillan', edition: '2nd' },
      tagKey: 'basic-income',
      annotation: {
        content:
          'Wray provides a systematic academic introduction to Modern Monetary Theory, explaining how sovereign currency systems actually work—from the operational realities of government spending to the role of the central bank. The book covers sectoral balances, functional finance, the job guarantee, and the euro crisis, serving as the standard textbook for MMT.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title: 'The 7 Deadly Innocent Frauds of Economic Policy',
      authors: [{ firstName: 'Warren', lastName: 'Mosler' }],
      year: 2010,
      metadata: { publisher: 'Valance Co.' },
      tagKey: 'basic-income',
      extraProjectKeys: ['p1-archived'],
      annotation: {
        content:
          'Mosler, a hedge fund manager and originator of many MMT ideas, identifies seven widely held beliefs about government budgets, trade, and social security that he argues are factually incorrect. Written in accessible language, the book distills the core operational insights of Modern Monetary Theory—that a sovereign currency issuer can always meet its obligations in its own currency. While polemical, it is useful as a gateway text to MMT concepts.',
        type: 'critical',
      },
    },

    // ============================================================
    // GROUP C: Post-growth, degrowth, steady-state (10)
    // ============================================================
    {
      entryType: 'book',
      title: 'Doughnut Economics: Seven Ways to Think Like a 21st-Century Economist',
      authors: [{ firstName: 'Kate', lastName: 'Raworth' }],
      year: 2017,
      metadata: { publisher: 'Chelsea Green Publishing' },
      isFavorite: true,
      tagKey: 'degrowth',
      customFields: { 'Reading Status': 'completed', Priority: 'high' },
      annotation: {
        content:
          'Raworth proposes the "doughnut" as a visual framework for sustainable development: humanity must meet a social foundation of basic needs (the inner ring) without overshooting the ecological ceiling of planetary boundaries (the outer ring). She challenges growth-centric economics with seven paradigm shifts including designing for distribution, becoming regenerative, and being agnostic about GDP growth. The framework has been adopted by Amsterdam, Barcelona, and other cities as a policy compass.',
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title: 'A Safe and Just Space for Humanity: Can We Live Within the Doughnut?',
      authors: [{ firstName: 'Kate', lastName: 'Raworth' }],
      year: 2012,
      metadata: {
        publisher: 'Oxfam',
        url: 'https://www.oxfam.org/en/research/safe-and-just-space-humanity',
      },
      tagKey: 'degrowth',
      annotation: {
        content:
          'This Oxfam discussion paper is the original articulation of the doughnut framework, combining the planetary boundaries concept of Rockström et al. with a social foundation derived from the Rio+20 priorities. Raworth demonstrates that no country currently meets all social thresholds without transgressing ecological boundaries, establishing the central tension that her later book explores in depth.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'book',
      title: 'Steady-State Economics',
      authors: [{ firstName: 'Herman', middleName: 'E.', lastName: 'Daly' }],
      year: 1991,
      metadata: { publisher: 'Island Press', edition: '2nd' },
      tagKey: 'degrowth',
      annotation: {
        content:
          'Daly, a former World Bank senior economist, makes the foundational case that the economy is a subsystem of the finite biosphere and therefore cannot grow indefinitely. He argues for a steady-state economy that maintains constant throughput of matter and energy at sustainable levels, using institutions like depletion quotas and distributist policies. This book is the intellectual wellspring of both the degrowth and ecological economics movements.',
        type: 'reflective',
      },
    },
    {
      entryType: 'book',
      title: 'Prosperity Without Growth: Foundations for the Economy of Tomorrow',
      authors: [{ firstName: 'Tim', lastName: 'Jackson' }],
      year: 2017,
      metadata: { publisher: 'Routledge', edition: '2nd' },
      tagKey: 'degrowth',
      notes:
        'Updated 2nd edition incorporates post-2008 data. Central argument: growth in affluent nations is neither sustainable nor necessary for human flourishing.',
      annotation: {
        content:
          'Jackson demonstrates that continued economic growth in wealthy nations is ecologically unsustainable and increasingly fails to improve well-being. He develops an alternative macroeconomics for sustainability, proposing investment in ecological assets, work-time reduction, and a shift from consumption-driven to service-based economies. Originally a UK government commission report, it became one of the most influential critiques of growth-dependent economics.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title: 'Degrowth: A Vocabulary for a New Era',
      authors: [
        { firstName: 'Giacomo', lastName: "D'Alisa" },
        { firstName: 'Federico', lastName: 'Demaria' },
        { firstName: 'Giorgos', lastName: 'Kallis' },
      ],
      year: 2015,
      metadata: { publisher: 'Routledge' },
      tagKey: 'degrowth',
      annotation: {
        content:
          'This edited volume serves as a conceptual encyclopedia for the degrowth movement, with short entries by leading scholars on key terms including conviviality, care, commons, autonomy, anti-utilitarianism, and buen vivir. It establishes degrowth not merely as an economic proposal but as a comprehensive cultural and political project encompassing feminism, environmentalism, and postcolonial critique.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title: 'Less Is More: How Degrowth Will Save the World',
      authors: [{ firstName: 'Jason', lastName: 'Hickel' }],
      year: 2020,
      metadata: { publisher: 'William Heinemann' },
      tagKey: 'degrowth',
      annotation: {
        content:
          'Hickel traces the ideology of perpetual growth from 16th-century colonialism to present-day GDP fetishism and argues that rich nations must actively scale down their material throughput to avert ecological collapse. He proposes a post-growth agenda centered on reducing inequality, shortening working hours, investing in public goods, and measuring progress by well-being rather than output. The book is the most popular contemporary introduction to degrowth thought.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'book',
      title: 'The Limits to Growth: A Report for the Club of Rome',
      authors: [
        { firstName: 'Donella', middleName: 'H.', lastName: 'Meadows' },
        { firstName: 'Dennis', middleName: 'L.', lastName: 'Meadows' },
        { firstName: 'Jørgen', lastName: 'Randers' },
        { firstName: 'William', middleName: 'W.', lastName: 'Behrens' },
      ],
      year: 1972,
      metadata: { publisher: 'Universe Books' },
      tagKey: 'degrowth',
      extraProjectKeys: ['p1-archived'],
      annotation: {
        content:
          'Using the World3 computer simulation, the authors modeled interactions among population, industrial growth, food production, and resource depletion, concluding that if growth trends continued unchanged, the limits to growth on earth would be reached within 100 years. Though widely criticized at the time, subsequent analyses have shown the standard-run scenario tracking remarkably well. It remains the foundational text of the limits-to-growth tradition.',
        type: 'reflective',
      },
    },
    {
      entryType: 'book',
      title: 'Limits to Growth: The 30-Year Update',
      authors: [
        { firstName: 'Donella', lastName: 'Meadows' },
        { firstName: 'Jørgen', lastName: 'Randers' },
        { firstName: 'Dennis', lastName: 'Meadows' },
      ],
      year: 2004,
      metadata: { publisher: 'Chelsea Green Publishing' },
      tagKey: 'degrowth',
      annotation: {
        content:
          'This update revisits the original World3 model with three decades of additional data, finding that the global system had by 2004 already overshot several sustainable limits. The authors present updated scenarios showing that a sustainable future was still achievable but required immediate policy action. The update strengthened the empirical credibility of the original study by demonstrating that its "standard run" scenario closely matched real-world trends.',
        type: 'summary',
      },
    },
    {
      entryType: 'journal_article',
      title: 'A Good Life for All Within Planetary Boundaries',
      authors: [
        { firstName: 'Daniel', middleName: 'W.', lastName: "O'Neill" },
        { firstName: 'Andrew', middleName: 'L.', lastName: 'Fanning' },
        { firstName: 'William', middleName: 'F.', lastName: 'Lamb' },
        { firstName: 'Julia', middleName: 'K.', lastName: 'Steinberger' },
      ],
      year: 2018,
      metadata: {
        doi: '10.1038/s41893-018-0021-4',
        journal: 'Nature Sustainability',
        volume: '1',
        pages: '88-95',
        publisher: 'Nature Publishing Group',
      },
      isFavorite: true,
      tagKey: 'degrowth',
      annotation: {
        content:
          "O'Neill et al. operationalize the doughnut framework by comparing 150 nations' performance on 11 social indicators and 7 biophysical boundaries. They find that no country meets basic needs for its citizens at a globally sustainable level of resource use, and that moving from sufficient to excess social performance requires disproportionately large ecological costs. The paper quantifies the central challenge of sustainable development: sufficiency for all within planetary limits.",
        type: 'summary',
      },
      veritasScore: {
        overallScore: 89,
        confidence: 0.9,
        label: 'high',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 93,
            weight: 0.2,
            evidence: 'Nature Sustainability is a high-impact Nature portfolio journal',
            source: 'Semantic Scholar',
          },
          {
            name: 'Methodology',
            score: 88,
            weight: 0.25,
            evidence:
              'Cross-national analysis of 150 countries using biophysical and social indicators',
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 90,
            weight: 0.2,
            evidence: 'Over 700 citations; widely used in sustainability policy',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 85,
            weight: 0.2,
            evidence: "O'Neill at University of Leeds; Steinberger is IPCC lead author",
            source: 'OpenAlex',
          },
          {
            name: 'Currency',
            score: 88,
            weight: 0.15,
            evidence: 'Published 2018; dataset regularly updated by authors',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'journal_article',
      title: 'A Safe Operating Space for Humanity',
      authors: [{ firstName: 'Johan', lastName: 'Rockström' }],
      year: 2009,
      metadata: {
        doi: '10.1038/461472a',
        journal: 'Nature',
        volume: '461',
        pages: '472-475',
        publisher: 'Nature Publishing Group',
      },
      tagKey: 'degrowth',
      notes:
        'Seminal paper defining the 9 planetary boundaries. Three boundaries (climate change, biodiversity loss, nitrogen cycle) had already been transgressed at time of publication.',
      annotation: {
        content:
          'Rockström and 28 co-authors identify nine planetary boundaries—including climate change, biodiversity loss, nitrogen and phosphorus cycles, and ocean acidification—that define a "safe operating space" for human civilization. They argue that transgressing these boundaries risks triggering non-linear, abrupt environmental change with catastrophic consequences. This framework has become central to sustainability science and underpins the ecological ceiling of Raworth\'s doughnut model.',
        type: 'summary',
      },
      veritasScore: {
        overallScore: 93,
        confidence: 0.94,
        label: 'exceptional',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 98,
            weight: 0.2,
            evidence: "Nature is the world's most prestigious multidisciplinary journal",
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 96,
            weight: 0.25,
            evidence: 'Over 8000 citations; defined the planetary boundaries framework',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 92,
            weight: 0.2,
            evidence:
              'Rockström directs Potsdam Institute; 28 co-authors include leading Earth system scientists',
            source: 'OpenAlex',
          },
          {
            name: 'Peer Review',
            score: 95,
            weight: 0.2,
            evidence: 'Full Nature review process',
            source: 'CrossRef',
          },
          {
            name: 'Currency',
            score: 85,
            weight: 0.15,
            evidence: 'Published 2009; updated in 2015 and 2023 with expanded boundaries',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },

    // ============================================================
    // GROUP D: Commons, shared resources, peer production (8)
    // ============================================================
    {
      entryType: 'book',
      title: 'Governing the Commons: The Evolution of Institutions for Collective Action',
      authors: [{ firstName: 'Elinor', lastName: 'Ostrom' }],
      year: 1990,
      metadata: { doi: '10.1017/CBO9780511807763', publisher: 'Cambridge University Press' },
      isFavorite: true,
      tagKey: 'commons',
      customFields: { 'Reading Status': 'completed', Priority: 'high' },
      annotation: {
        content:
          'Ostrom\'s Nobel Prize-winning work demonstrates that communities can and do successfully manage common-pool resources without either privatization or top-down state regulation, contradicting Hardin\'s "tragedy of the commons." Through extensive field research on irrigation systems, fisheries, and forests, she identifies eight design principles for durable commons governance. The book is the foundational text for commons-based institutional theory.',
        type: 'summary',
      },
      veritasScore: {
        overallScore: 96,
        confidence: 0.95,
        label: 'exceptional',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 95,
            weight: 0.2,
            evidence: 'Cambridge University Press; landmark political science text',
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 98,
            weight: 0.25,
            evidence: 'Over 50,000 citations; one of the most-cited books in social science',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 98,
            weight: 0.2,
            evidence: 'Elinor Ostrom won the 2009 Nobel Prize in Economics for this work',
            source: 'OpenAlex',
          },
          {
            name: 'Peer Review',
            score: 92,
            weight: 0.2,
            evidence: 'University press peer review; decades of subsequent empirical validation',
            source: 'CrossRef',
          },
          {
            name: 'Currency',
            score: 78,
            weight: 0.15,
            evidence: 'Published 1990; foundational but subsequent work has extended the framework',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
        userOverride: 98,
        userOverrideReason:
          'Nobel Prize-winning work; foundational text for entire field of commons governance research',
      },
    },
    {
      entryType: 'book',
      title: 'The Wealth of Networks: How Social Production Transforms Markets and Freedom',
      authors: [{ firstName: 'Yochai', lastName: 'Benkler' }],
      year: 2006,
      metadata: { publisher: 'Yale University Press' },
      tagKey: 'commons',
      extraProjectKeys: ['p1-mechanism'],
      annotation: {
        content:
          'Benkler argues that the networked information economy enables a new mode of production—"commons-based peer production"—in which decentralized individuals cooperate without market signals or managerial hierarchy, as exemplified by Wikipedia and open-source software. He contends this fundamentally challenges the industrial model\'s assumptions about the need for property-based incentives and opens possibilities for enhanced individual autonomy and democratic participation.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title:
        'Ours to Hack and to Own: The Rise of Platform Cooperativism, a New Vision for the Future of Work and a Fairer Internet',
      authors: [{ firstName: 'Trebor', lastName: 'Scholz' }],
      year: 2017,
      metadata: { publisher: 'OR Books' },
      tagKey: 'commons',
      extraProjectKeys: ['p1-mechanism'],
      annotation: {
        content:
          'This edited collection gathers over 40 contributors to articulate the vision of platform cooperativism—digital platforms owned and governed democratically by their workers, users, or communities. It covers theoretical foundations, existing examples (Stocksy, Fairmondo, Loconomics), legal structures, and strategies for scaling cooperative platforms to compete with venture capital-backed corporations.',
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title: 'Platform Cooperativism: Challenging the Corporate Sharing Economy',
      authors: [{ firstName: 'Trebor', lastName: 'Scholz' }],
      year: 2016,
      metadata: {
        publisher: 'Rosa Luxemburg Foundation',
        url: 'https://rosalux.nyc/platform-cooperativism-2/',
      },
      tagKey: 'commons',
      extraProjectKeys: ['p1-mechanism'],
      annotation: {
        content:
          'Scholz\'s foundational paper coins the term "platform cooperativism" and outlines how cooperative ownership models can be applied to digital platforms. He identifies ten principles for platform co-ops—including broad-based ownership, decent pay, transparency, and data portability—and catalogs over two dozen existing examples. The paper launched a global movement and research agenda around democratic alternatives to extractive platform capitalism.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'book',
      title: 'Everything for Everyone: The Radical Tradition that Is Shaping the Next Economy',
      authors: [{ firstName: 'Nathan', lastName: 'Schneider' }],
      year: 2018,
      metadata: { publisher: 'Nation Books' },
      tagKey: 'commons',
      annotation: {
        content:
          'Schneider traces the cooperative tradition from medieval guilds and 19th-century Rochdale pioneers to contemporary platform cooperatives and blockchain-based governance experiments. He argues that cooperativism is not a nostalgic relic but a scalable institutional form suited to the digital economy, emphasizing that how we own determines how we innovate, distribute value, and exercise democratic agency.',
        type: 'reflective',
      },
    },
    {
      entryType: 'book',
      title: 'Think Like a Commoner: A Short Introduction to the Life of the Commons',
      authors: [{ firstName: 'David', lastName: 'Bollier' }],
      year: 2014,
      metadata: { publisher: 'New Society Publishers' },
      tagKey: 'commons',
      annotation: {
        content:
          'Bollier provides an accessible introduction to commons thinking, arguing that commons are not merely shared resources but social systems—communities with shared norms, governance rules, and relationships of stewardship. He covers digital commons, traditional knowledge commons, urban commons, and offers the commons as a paradigm that transcends the state-versus-market binary.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title: 'Patterns of Commoning',
      authors: [
        { firstName: 'David', lastName: 'Bollier' },
        { firstName: 'Silke', lastName: 'Helfrich' },
      ],
      year: 2015,
      metadata: { publisher: 'Commons Strategies Group / Levellers Press' },
      tagKey: 'commons',
      annotation: {
        content:
          'This anthology documents dozens of real-world commons projects spanning community forests, seed-sharing networks, open-source hardware, collaborative mapping, and alternative currencies. Bollier and Helfrich argue that these examples reveal "commoning" as an active social practice—not just resource management but a way of being that generates livelihoods, knowledge, and ecological stewardship outside of market and state institutions.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'report',
      title: 'Commons Transition and P2P: A Primer',
      authors: [],
      year: 2017,
      metadata: {
        publisher: 'Transnational Institute / P2P Foundation',
        url: 'https://commonstransition.org/commons-transition-p2p-primer/',
      },
      tagKey: 'commons',
      extraProjectKeys: ['p1-mechanism'],
      annotation: {
        content:
          'This primer from the P2P Foundation synthesizes the vision of a "commons transition"—a societal shift toward peer-to-peer governance, open cooperative production, and shared stewardship of knowledge and natural resources. It proposes a "Partner State" model where government enables commons-based production rather than controlling it, and maps the institutional ecosystem needed for a post-capitalist commons economy.',
        type: 'summary',
      },
    },

    // ============================================================
    // GROUP E: Digital capitalism, data value (8)
    // ============================================================
    {
      entryType: 'book',
      title: 'Platform Capitalism',
      authors: [{ firstName: 'Nick', lastName: 'Srnicek' }],
      year: 2016,
      metadata: { publisher: 'Polity Press' },
      tagKey: 'digital',
      extraProjectKeys: ['p1-mechanism'],
      annotation: {
        content:
          'Srnicek provides a concise political-economic analysis of the platform model, arguing that platforms emerged as a response to declining profitability in manufacturing by extracting value from data. He categorizes platforms into five types—advertising, cloud, industrial, product, and lean—and shows how each captures and monetizes data. The book is essential for understanding the economic logic of digital capitalism.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title: 'PostCapitalism: A Guide to Our Future',
      authors: [{ firstName: 'Paul', lastName: 'Mason' }],
      year: 2015,
      metadata: { publisher: 'Allen Lane / Farrar, Straus and Giroux' },
      tagKey: 'digital',
      notes:
        'Mason argues info-tech is dissolving the price mechanism. Interesting synthesis of Kondratieff waves, Marx, and network theory. Controversial but stimulating.',
      annotation: {
        content:
          'Mason argues that information technology is fundamentally corroding the mechanisms of capitalism by reducing marginal costs toward zero, enabling non-market peer production, and dissolving the link between labor time and value. Drawing on Kondratieff long-wave theory and Marx, he contends that capitalism is reaching its systemic limits and that a postcapitalist economy based on shared knowledge, collaborative production, and reduced work time is already emerging.',
        type: 'critical',
      },
    },
    {
      entryType: 'book',
      title:
        'The Zero Marginal Cost Society: The Internet of Things, the Collaborative Commons, and the Eclipse of Capitalism',
      authors: [{ firstName: 'Jeremy', lastName: 'Rifkin' }],
      year: 2014,
      metadata: { publisher: 'Palgrave Macmillan' },
      tagKey: 'digital',
      annotation: {
        content:
          'Rifkin argues that the convergence of communication, energy, and logistics internets is driving marginal costs toward zero across the economy, enabling a "collaborative commons" that will gradually eclipse traditional capitalism. He predicts a hybrid economy where the capitalist market and the sharing commons coexist, with the commons sector growing as prosumers produce and share energy, goods, and knowledge at near-zero cost.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'book',
      title:
        'The Age of Surveillance Capitalism: The Fight for a Human Future at the New Frontier of Power',
      authors: [{ firstName: 'Shoshana', lastName: 'Zuboff' }],
      year: 2019,
      metadata: { isbn: '9781610395694', publisher: 'PublicAffairs' },
      isFavorite: true,
      tagKey: 'digital',
      extraProjectKeys: ['p1-mechanism'],
      customFields: { 'Reading Status': 'completed' },
      annotation: {
        content:
          'Zuboff coins "surveillance capitalism" to describe a new economic logic in which human experience is unilaterally claimed as raw material for prediction products sold in behavioral futures markets. She traces its invention at Google and its spread to Facebook, Microsoft, and beyond, arguing it represents an unprecedented form of power that threatens autonomy, democracy, and human sovereignty. The book is the definitive critical analysis of the data extraction economy.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title: 'Who Owns the Future?',
      authors: [{ firstName: 'Jaron', lastName: 'Lanier' }],
      year: 2013,
      metadata: { publisher: 'Simon & Schuster' },
      tagKey: 'digital',
      extraProjectKeys: ['p1-mechanism'],
      annotation: {
        content:
          'Lanier argues that the rise of "siren servers"—massively centralized information hubs like Google and Facebook—is destroying middle-class livelihoods by extracting value from user data without compensation. He proposes a system of micropayments in which individuals are compensated whenever their data contributes to an economic outcome, laying early groundwork for the "data as labor" framework later developed with Glen Weyl.',
        type: 'reflective',
      },
    },
    {
      entryType: 'journal_article',
      title: 'A Blueprint for a Better Digital Society',
      authors: [
        { firstName: 'Jaron', lastName: 'Lanier' },
        { firstName: 'E.', middleName: 'Glen', lastName: 'Weyl' },
      ],
      year: 2018,
      metadata: {
        journal: 'Harvard Business Review',
        url: 'https://hbr.org/2018/09/a-blueprint-for-a-better-digital-society',
      },
      tagKey: 'digital',
      extraProjectKeys: ['p1-mechanism'],
      annotation: {
        content:
          'Lanier and Weyl argue for "data dignity"—the principle that people should be recognized and compensated for the value their data creates. They propose a system of "mediators of individual data" (MIDs) that would negotiate collectively on behalf of data producers, similar to unions or talent agencies. This HBR article is a policy-accessible distillation of the data-as-labor thesis.',
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title: 'Should We Treat Data as Labor? Moving Beyond "Free"',
      authors: [
        { firstName: 'Imanol', lastName: 'Arrieta-Ibarra' },
        { firstName: 'Leonard', lastName: 'Goff' },
        { firstName: 'Diego', lastName: 'Jiménez-Hernández' },
        { firstName: 'Jaron', lastName: 'Lanier' },
        { firstName: 'E.', middleName: 'Glen', lastName: 'Weyl' },
      ],
      year: 2018,
      metadata: {
        publisher: 'AEA Papers and Proceedings / SSRN',
        url: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3093683',
      },
      tagKey: 'digital',
      extraProjectKeys: ['p1-mechanism'],
      annotation: {
        content:
          'This working paper provides the formal economic argument for treating data as labor rather than as capital or a freely given byproduct. The authors model how a data-labor market could work, showing that compensating users for their data would both be more equitable and could improve AI systems by incentivizing higher-quality data provision. The paper connects the "data dignity" vision to rigorous economic theory.',
        type: 'critical',
      },
      veritasScore: {
        overallScore: 75,
        confidence: 0.78,
        label: 'moderate',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 70,
            weight: 0.2,
            evidence: 'Working paper / AEA P&P short format; not full peer review',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 85,
            weight: 0.25,
            evidence:
              'Weyl is Principal Researcher at Microsoft; Lanier is pioneer of VR and digital rights',
            source: 'OpenAlex',
          },
          {
            name: 'Methodology',
            score: 72,
            weight: 0.2,
            evidence: 'Theoretical model; limited empirical validation',
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 78,
            weight: 0.2,
            evidence: 'Over 200 citations; influential in data governance debates',
            source: 'Semantic Scholar',
          },
          {
            name: 'Currency',
            score: 80,
            weight: 0.15,
            evidence: 'Published 2018; concept adopted by several policy proposals',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'journal_article',
      title: 'Is Data Labor? Two Conceptions of Work and the User-Platform Relationship',
      authors: [{ firstName: 'Jens', middleName: 'D.', lastName: 'Jonker' }],
      year: 2024,
      metadata: { publisher: 'Philosophy & Technology / Springer' },
      tagKey: 'digital',
      extraProjectKeys: ['p1-mechanism'],
      annotation: {
        content:
          'Jonker critically examines the "data as labor" framework by distinguishing between two conceptions of work: the productivity-based view (data production generates economic value) and the republican view (data labor creates relations of domination). He argues that treating data as labor risks commodifying human experience and proposes instead that the key normative issue is power asymmetry, not compensation. This paper adds needed philosophical rigor to the data dignity debate.',
        type: 'critical',
      },
    },

    // ============================================================
    // GROUP F: Mechanism design + "new rules" proposals (6)
    // ============================================================
    {
      entryType: 'book',
      title: 'Radical Markets: Uprooting Capitalism and Democracy for a Just Society',
      authors: [
        { firstName: 'Eric', middleName: 'A.', lastName: 'Posner' },
        { firstName: 'E.', middleName: 'Glen', lastName: 'Weyl' },
      ],
      year: 2018,
      metadata: { isbn: '9780691177502', publisher: 'Princeton University Press' },
      isFavorite: true,
      tagKey: 'mechanism',
      extraProjectKeys: ['p1-mechanism'],
      customFields: { 'Reading Status': 'completed' },
      annotation: {
        content:
          'Posner and Weyl propose radical market-based mechanisms to address inequality and stagnation: a Common Ownership Self-Assessed Tax (COST) on property, quadratic voting for collective decisions, individual visa sponsorship for immigration, data as labor, and antitrust reforms. They argue that well-designed markets can be powerful tools for equity and efficiency, challenging both laissez-faire and traditional progressive approaches. The book launched the RadicalxChange movement.',
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title: 'A Flexible Design for Funding Public Goods (Working Paper)',
      authors: [
        { firstName: 'Vitalik', lastName: 'Buterin' },
        { firstName: 'Zoë', lastName: 'Hitzig' },
        { firstName: 'E.', middleName: 'Glen', lastName: 'Weyl' },
      ],
      year: 2018,
      metadata: { url: 'https://arxiv.org/abs/1809.06421', publisher: 'arXiv' },
      tagKey: 'mechanism',
      extraProjectKeys: ['p1-mechanism'],
      annotation: {
        content:
          'This paper introduces Quadratic Funding (QF), a mechanism for funding public goods in which individual contributions to projects are matched by a central fund according to a formula that weights the number of contributors more than the size of contributions. The design incentivizes broad-based support and has been implemented in Gitcoin Grants for Ethereum ecosystem funding. The arXiv version is the original working paper.',
        type: 'summary',
      },
    },
    {
      entryType: 'journal_article',
      title: 'A Flexible Design for Funding Public Goods',
      authors: [
        { firstName: 'Vitalik', lastName: 'Buterin' },
        { firstName: 'Zoë', lastName: 'Hitzig' },
        { firstName: 'E.', middleName: 'Glen', lastName: 'Weyl' },
      ],
      year: 2019,
      metadata: {
        journal: 'Management Science',
        volume: '65',
        issue: '11',
        pages: '5171-5187',
        publisher: 'INFORMS',
      },
      tagKey: 'mechanism',
      extraProjectKeys: ['p1-mechanism'],
      annotation: {
        content:
          'The peer-reviewed version of the Quadratic Funding paper proves that QF is the unique mechanism satisfying certain desirable properties for public goods provision under certain conditions. The Management Science publication gave the concept formal academic legitimacy beyond its origins in the cryptocurrency community. QF has since been used to distribute over $50 million in public goods funding.',
        type: 'evaluative',
      },
      veritasScore: {
        overallScore: 82,
        confidence: 0.83,
        label: 'high',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 88,
            weight: 0.2,
            evidence: 'Management Science is a top operations research / management journal',
            source: 'Semantic Scholar',
          },
          {
            name: 'Methodology',
            score: 85,
            weight: 0.25,
            evidence: 'Formal mechanism design proof with axiomatic characterization',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 80,
            weight: 0.2,
            evidence:
              'Buterin is Ethereum co-founder; Weyl is Microsoft Principal Researcher; Hitzig at Harvard',
            source: 'OpenAlex',
          },
          {
            name: 'Citation Impact',
            score: 75,
            weight: 0.2,
            evidence: 'Over 300 citations; practical adoption in Gitcoin Grants',
            source: 'Semantic Scholar',
          },
          {
            name: 'Currency',
            score: 85,
            weight: 0.15,
            evidence: 'Published 2019; mechanism actively deployed and iterated',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'report',
      title: 'Ethereum: A Next-Generation Smart Contract and Decentralized Application Platform',
      authors: [{ firstName: 'Vitalik', lastName: 'Buterin' }],
      year: 2014,
      metadata: { url: 'https://ethereum.org/en/whitepaper/', publisher: 'Ethereum Foundation' },
      tagKey: 'mechanism',
      extraProjectKeys: ['p1-mechanism'],
      annotation: {
        content:
          'Buterin\'s white paper proposes Ethereum as a general-purpose blockchain platform enabling programmable "smart contracts" and decentralized applications. Unlike Bitcoin\'s limited scripting, Ethereum provides a Turing-complete programming environment, enabling decentralized finance, governance mechanisms, and token economies. The paper laid the technical foundation for the broader Web3 ecosystem and many of the mechanism design experiments discussed in this bibliography.',
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title: 'Bitcoin: A Peer-to-Peer Electronic Cash System',
      authors: [{ firstName: 'Satoshi', lastName: 'Nakamoto' }],
      year: 2008,
      metadata: { url: 'https://bitcoin.org/bitcoin.pdf' },
      tagKey: 'mechanism',
      extraProjectKeys: ['p1-mechanism'],
      notes:
        'The foundational cryptocurrency white paper. Only 9 pages but arguably one of the most consequential technical documents of the 21st century.',
      annotation: {
        content:
          'Nakamoto introduces a decentralized digital currency system using a peer-to-peer network, proof-of-work consensus, and a chain of cryptographic hashes to enable trustless transactions without a central authority. The paper solved the double-spending problem for digital currency and launched the blockchain revolution. Its significance extends beyond currency to any domain requiring decentralized consensus and immutable record-keeping.',
        type: 'reflective',
      },
    },
    {
      entryType: 'book',
      title: 'Token Economy: How the Web3 Reinvents the Internet',
      authors: [{ firstName: 'Shermin', lastName: 'Voshmgir' }],
      year: 2020,
      metadata: { publisher: 'Token Kitchen' },
      tagKey: 'mechanism',
      extraProjectKeys: ['p1-mechanism'],
      annotation: {
        content:
          'Voshmgir provides a comprehensive introduction to the token economy—the use of blockchain-based tokens to coordinate economic activity, governance, and incentive systems. She covers the history of the web, cryptographic fundamentals, token types (utility, security, governance), decentralized autonomous organizations, and the potential for tokens to create new forms of commons governance and public goods funding.',
        type: 'summary',
      },
    },

    // ============================================================
    // GROUP G: Well-being / happiness economics (9)
    // ============================================================
    {
      entryType: 'report',
      title:
        'Report of the Commission on the Measurement of Economic Performance and Social Progress',
      authors: [
        { firstName: 'Joseph', middleName: 'E.', lastName: 'Stiglitz' },
        { firstName: 'Amartya', lastName: 'Sen' },
        { firstName: 'Jean-Paul', lastName: 'Fitoussi' },
      ],
      year: 2009,
      metadata: {
        publisher: 'Commission on the Measurement of Economic Performance and Social Progress',
        url: 'https://www.stiglitz-sen-fitoussi.fr/',
      },
      isFavorite: true,
      tagKey: 'wellbeing',
      annotation: {
        content:
          'Commissioned by French President Sarkozy, this report by two Nobel laureates and a leading economist argues that GDP is a poor measure of societal well-being and proposes a multidimensional framework encompassing material living standards, health, education, social connections, governance, environment, and insecurity. It catalyzed a global movement to develop "beyond GDP" indicators and influenced the OECD\'s Better Life Initiative.',
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title: "How's Life? 2024: Well-being and Resilience in Times of Transition",
      authors: [],
      year: 2024,
      metadata: {
        publisher: 'OECD Publishing',
        url: 'https://www.oecd.org/en/publications/how-s-life-2024_f32a19a0-en.html',
      },
      tagKey: 'wellbeing',
      annotation: {
        content:
          "The OECD's flagship well-being report tracks 80+ indicators across 11 dimensions of current well-being (income, jobs, housing, health, education, environment, safety, civic engagement, community, life satisfaction, work-life balance) and resources for future well-being. The 2024 edition focuses on resilience during transitions including digitalization, climate change, and demographic shifts. It operationalizes the Stiglitz-Sen-Fitoussi recommendations at the policy level.",
        type: 'evaluative',
      },
    },
    {
      entryType: 'report',
      title: 'World Happiness Report 2025',
      authors: [],
      year: 2025,
      metadata: {
        publisher: 'Oxford Wellbeing Research Centre / Sustainable Development Solutions Network',
        url: 'https://worldhappiness.report/',
      },
      tagKey: 'wellbeing',
      notes:
        'Annual report ranking countries by subjective well-being. Uses Gallup World Poll data on life evaluations (Cantril ladder), positive affect, and negative affect.',
      annotation: {
        content:
          'The World Happiness Report ranks nations by subjective well-being using Gallup World Poll data on life evaluations, positive affect, and negative affect. It attributes variation in happiness to six key factors: GDP per capita, social support, healthy life expectancy, freedom, generosity, and corruption. The annual publication has become one of the most visible instruments for shifting policy attention from economic output to experienced well-being.',
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title:
        'Human Development Report 2025: A Matter of Choice: People and Possibilities in the Age of AI',
      authors: [],
      year: 2025,
      metadata: { publisher: 'United Nations Development Programme', url: 'https://hdr.undp.org/' },
      tagKey: 'wellbeing',
      annotation: {
        content:
          "The 2025 HDR examines how artificial intelligence is reshaping human development possibilities and risks, arguing that the choices made now about AI governance will determine whether it expands or narrows human capabilities. The report applies the Human Development Index and capability approach to evaluate AI's impact on education, health, livelihoods, and agency across countries at different development levels.",
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title:
        'Human Development Report 2023/2024: Breaking the Gridlock: Reimagining Cooperation in a Polarized World',
      authors: [],
      year: 2024,
      metadata: {
        publisher: 'United Nations Development Programme',
        url: 'https://hdr.undp.org/content/human-development-report-2023-24',
      },
      tagKey: 'wellbeing',
      annotation: {
        content:
          'This UNDP report documents a paradox: while human development (as measured by HDI) had been improving, global cooperation has stalled precisely when collective action is most needed for challenges like climate change, pandemics, and digital governance. It proposes reforms to multilateral institutions and argues for a renewed focus on global public goods provision that centers human development outcomes.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'journal_article',
      title: 'High Income Improves Evaluation of Life but Not Emotional Well-Being',
      authors: [
        { firstName: 'Daniel', lastName: 'Kahneman' },
        { firstName: 'Angus', lastName: 'Deaton' },
      ],
      year: 2010,
      metadata: {
        doi: '10.1073/pnas.1011492107',
        journal: 'Proceedings of the National Academy of Sciences',
        volume: '107',
        issue: '38',
        pages: '16489-16493',
        publisher: 'National Academy of Sciences',
      },
      tagKey: 'wellbeing',
      notes:
        'Famous $75,000 threshold study. Emotional well-being plateaus around $75K annual income (in 2010 dollars), while life evaluation continues to rise with income. Later nuanced by Killingsworth (2021).',
      annotation: {
        content:
          'Kahneman and Deaton analyze Gallup survey data from 450,000 Americans and distinguish between two forms of well-being: emotional well-being (day-to-day feelings) and life evaluation (overall life satisfaction). They find that emotional well-being rises with income up to about $75,000 per year and then plateaus, while life evaluation continues to rise logarithmically with income. The finding that money buys life satisfaction but not happiness above a threshold has profoundly influenced the beyond-GDP discourse.',
        type: 'summary',
      },
      veritasScore: {
        overallScore: 90,
        confidence: 0.92,
        label: 'exceptional',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 95,
            weight: 0.2,
            evidence: 'PNAS is a top multidisciplinary journal',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 98,
            weight: 0.2,
            evidence: 'Kahneman won Nobel Prize in Economics; Deaton won Nobel Prize in Economics',
            source: 'OpenAlex',
          },
          {
            name: 'Citation Impact',
            score: 94,
            weight: 0.25,
            evidence: 'Over 4000 citations; one of the most-cited papers on income and well-being',
            source: 'Semantic Scholar',
          },
          {
            name: 'Methodology',
            score: 82,
            weight: 0.2,
            evidence:
              'Large-N survey data; later partially challenged by Killingsworth (2021) on the plateau claim',
            source: 'Semantic Scholar',
          },
          {
            name: 'Currency',
            score: 80,
            weight: 0.15,
            evidence:
              'Published 2010; threshold finding debated but conceptual distinction remains influential',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
        userOverride: 92,
        userOverrideReason:
          'Two Nobel laureates; conceptual distinction between life evaluation and emotional well-being remains fundamental even if the exact threshold is debated',
      },
    },
    {
      entryType: 'book',
      title: 'Happiness: Lessons from a New Science',
      authors: [{ firstName: 'Richard', lastName: 'Layard' }],
      year: 2005,
      metadata: { publisher: 'Penguin' },
      tagKey: 'wellbeing',
      annotation: {
        content:
          'Layard, an economist at the London School of Economics, argues that the science of happiness should inform public policy. He synthesizes evidence from psychology, neuroscience, and economics showing that beyond a certain income threshold, further growth does not increase happiness, while social relationships, meaningful work, and mental health are far more important. The book helped establish "happiness economics" as a legitimate policy discipline.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'book',
      title: 'Development as Freedom',
      authors: [{ firstName: 'Amartya', lastName: 'Sen' }],
      year: 1999,
      metadata: { publisher: 'Alfred A. Knopf' },
      tagKey: 'wellbeing',
      customFields: { 'Reading Status': 'completed', Priority: 'high' },
      annotation: {
        content:
          'Sen articulates his "capability approach," arguing that development should be understood not as growth in GDP but as the expansion of substantive human freedoms—the real opportunities people have to lead lives they value. He demonstrates how unfreedoms (poverty, tyranny, social deprivation, neglect of public facilities) are interconnected and that their removal is both the primary end and the principal means of development. This is the philosophical foundation of the Human Development Index.',
        type: 'reflective',
      },
    },
    {
      entryType: 'book',
      title: 'Creating Capabilities: The Human Development Approach',
      authors: [{ firstName: 'Martha', middleName: 'C.', lastName: 'Nussbaum' }],
      year: 2011,
      metadata: { publisher: 'Harvard University Press' },
      tagKey: 'wellbeing',
      annotation: {
        content:
          'Nussbaum develops her version of the capability approach, proposing a list of ten "central capabilities" (life, health, bodily integrity, senses/imagination, emotions, practical reason, affiliation, other species, play, control over environment) that constitute a minimum threshold of justice. She argues that any just society must ensure each person reaches a threshold level of every capability. The book provides a normative framework for evaluating whether economic systems serve human flourishing.',
        type: 'summary',
      },
    },

    // ============================================================
    // BONUS: Bibliography gold mines as website entries (3)
    // ============================================================
    {
      entryType: 'website',
      title: 'Stanford Encyclopedia of Philosophy: Distributive Justice',
      authors: [],
      year: 2024,
      metadata: {
        url: 'https://plato.stanford.edu/entries/justice-distributive/',
        accessDate: '2025-12-01',
        publisher: 'Stanford University',
      },
      tagKey: 'wellbeing',
      annotation: {
        content:
          'The SEP entry on distributive justice provides a comprehensive overview of philosophical theories of fair distribution—including utilitarianism, libertarianism, egalitarianism, and the capability approach—with an extended bibliography that is a gold mine for expanding research into normative foundations of redistribution, welfare, and post-labor income.',
        type: 'summary',
      },
    },
    {
      entryType: 'website',
      title: 'Degrowth.info: Research & Resources',
      authors: [],
      year: 2025,
      metadata: { url: 'https://degrowth.info/', accessDate: '2025-12-01' },
      tagKey: 'degrowth',
      annotation: {
        content:
          'Degrowth.info is the central hub for the international degrowth research community, hosting reading lists, conference proceedings, and curated bibliographies that include feminist, decolonial, and Global South perspectives on post-growth economics. It is an excellent launch pad for expanding beyond the Anglophone canon.',
        type: 'summary',
      },
    },
    {
      entryType: 'website',
      title: 'BIEN: Basic Income Earth Network',
      authors: [],
      year: 2025,
      metadata: { url: 'https://basicincome.org/', accessDate: '2025-12-01' },
      tagKey: 'basic-income',
      annotation: {
        content:
          'BIEN is the global academic and advocacy network for basic income research, hosting the journal Basic Income Studies, news on pilots and experiments worldwide, and a comprehensive archive of working papers and policy briefs. It is the single best starting point for systematic literature review on UBI.',
        type: 'summary',
      },
    },
  ],
}
