import type { SeedProjectConfig } from './types'

export const project2Config: SeedProjectConfig = {
  projects: [
    {
      key: 'p2-main',
      name: 'Human Cooperation & Welfare Institutions',
      description:
        'Bibliography on the evolutionary, psychological, and institutional foundations of human cooperation, welfare state legitimacy, health system design, and species-level macro forces.',
      color: '#7C3AED',
      isStarred: true,
    },
    {
      key: 'p2-health',
      name: 'Health Systems & Universal Coverage',
      description:
        'Focused collection on universal health coverage, primary health care declarations, social determinants of health, and resilient health system design.',
      color: '#0891B2',
    },
  ],

  tags: [
    {
      key: 'cooperation',
      name: 'Human Cooperation & Altruism',
      color: '#DC2626',
      description:
        'Evolutionary biology of cooperation, reciprocal altruism, punishment, cultural evolution, and gift economies',
    },
    {
      key: 'collective-action',
      name: 'Collective Action & Social Capital',
      color: '#2563EB',
      description:
        'Social trust, institutional quality, collective action problems, and civic engagement',
    },
    {
      key: 'welfare',
      name: 'Welfare-State Design & Public Attitudes',
      color: '#D97706',
      description:
        'Welfare regime typologies, deservingness perceptions, redistribution preferences, and universal vs. targeted programs',
    },
    {
      key: 'health',
      name: 'Health Systems & Healing',
      color: '#059669',
      description:
        'Universal health coverage, primary health care, social determinants of health, and health system resilience',
    },
    {
      key: 'trajectory',
      name: 'Species Trajectory & Macro Forces',
      color: '#7C3AED',
      description:
        'Global trends, population projections, climate scenarios, and systemic risk assessments',
    },
  ],

  entries: [
    // ============================================================
    // GROUP H: Human cooperation, altruism, reciprocity (18)
    // ============================================================
    {
      entryType: 'journal_article',
      title: 'The Genetical Evolution of Social Behaviour. I',
      authors: [{ firstName: 'William', middleName: 'D.', lastName: 'Hamilton' }],
      year: 1964,
      metadata: {
        doi: '10.1016/0022-5193(64)90038-4',
        journal: 'Journal of Theoretical Biology',
        volume: '7',
        issue: '1',
        pages: '1-16',
        publisher: 'Elsevier',
      },
      isFavorite: true,
      tagKey: 'cooperation',
      customFields: { 'Reading Status': 'completed', Priority: 'high' },
      annotation: {
        content:
          'Hamilton introduces the concept of "inclusive fitness," formalizing the idea that natural selection can favor altruistic behavior when the benefit to relatives, weighted by their genetic relatedness, exceeds the cost to the altruist (Hamilton\'s rule: rB > C). This paper, along with its companion, provided the first rigorous theoretical explanation for the evolution of cooperation among kin and is one of the most important papers in evolutionary biology.',
        type: 'summary',
      },
      veritasScore: {
        overallScore: 96,
        confidence: 0.95,
        label: 'exceptional',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 85,
            weight: 0.15,
            evidence: 'JTB is a respected theoretical biology journal',
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 98,
            weight: 0.3,
            evidence: 'Over 10,000 citations; one of the most-cited papers in evolutionary biology',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 95,
            weight: 0.2,
            evidence:
              'Hamilton is widely regarded as one of the greatest evolutionary theorists of the 20th century',
            source: 'OpenAlex',
          },
          {
            name: 'Methodology',
            score: 95,
            weight: 0.2,
            evidence: 'Rigorous mathematical population genetics framework',
            source: 'Semantic Scholar',
          },
          {
            name: 'Currency',
            score: 90,
            weight: 0.15,
            evidence: 'Published 1964; remains foundational and actively cited',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'journal_article',
      title: 'The Genetical Evolution of Social Behaviour. II',
      authors: [{ firstName: 'William', middleName: 'D.', lastName: 'Hamilton' }],
      year: 1964,
      metadata: {
        doi: '10.1016/0022-5193(64)90039-6',
        journal: 'Journal of Theoretical Biology',
        volume: '7',
        issue: '1',
        pages: '17-52',
        publisher: 'Elsevier',
      },
      tagKey: 'cooperation',
      annotation: {
        content:
          'The companion paper extends the inclusive fitness framework to cover population-level dynamics, sex ratio evolution, and the conditions under which altruism and spite can evolve. Hamilton models the interplay between population structure, assortment, and genetic relatedness, showing how spatial structure and limited dispersal can promote the evolution of cooperation even in the absence of kin recognition mechanisms.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'journal_article',
      title: 'The Evolution of Reciprocal Altruism',
      authors: [{ firstName: 'Robert', middleName: 'L.', lastName: 'Trivers' }],
      year: 1971,
      metadata: {
        doi: '10.1086/406755',
        journal: 'The Quarterly Review of Biology',
        volume: '46',
        issue: '1',
        pages: '35-57',
        publisher: 'University of Chicago Press',
      },
      isFavorite: true,
      tagKey: 'cooperation',
      annotation: {
        content:
          "Trivers introduces reciprocal altruism—the idea that natural selection can favor costly helping behavior between unrelated individuals when there is a sufficient probability of future reciprocation. He identifies conditions for its evolution (long lifespan, repeated interactions, ability to detect cheaters) and applies the theory to examples including cleaner fish, warning calls in birds, and human friendship. This paper, alongside Hamilton's kin selection, forms the second pillar of evolutionary cooperation theory.",
        type: 'summary',
      },
      veritasScore: {
        overallScore: 94,
        confidence: 0.93,
        label: 'exceptional',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 90,
            weight: 0.15,
            evidence: 'QRB is the premier review journal in biology',
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 97,
            weight: 0.3,
            evidence: 'Over 9000 citations; defined reciprocal altruism as a field',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 92,
            weight: 0.2,
            evidence:
              'Trivers is one of the most influential evolutionary biologists of the 20th century',
            source: 'OpenAlex',
          },
          {
            name: 'Methodology',
            score: 90,
            weight: 0.2,
            evidence: 'Formal evolutionary model with rich empirical examples',
            source: 'Semantic Scholar',
          },
          {
            name: 'Currency',
            score: 88,
            weight: 0.15,
            evidence: 'Published 1971; foundational and still actively cited',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'journal_article',
      title: 'The Evolution of Cooperation',
      authors: [
        { firstName: 'Robert', lastName: 'Axelrod' },
        { firstName: 'William', middleName: 'D.', lastName: 'Hamilton' },
      ],
      year: 1981,
      metadata: {
        doi: '10.1126/science.7466396',
        journal: 'Science',
        volume: '211',
        issue: '4489',
        pages: '1390-1396',
        publisher: 'American Association for the Advancement of Science',
      },
      isFavorite: true,
      tagKey: 'cooperation',
      notes:
        "Introduced the iterated Prisoner's Dilemma tournament showing that Tit-for-Tat—a simple strategy of cooperation and proportional retaliation—outperforms more complex strategies. Foundational for game-theoretic analysis of cooperation.",
      annotation: {
        content:
          'Axelrod and Hamilton demonstrate through computer tournaments that cooperation can evolve among self-interested agents in iterated Prisoner\'s Dilemma games. The simple strategy "Tit-for-Tat"—cooperate first, then mirror your partner\'s previous move—proved remarkably robust, winning both tournaments. The paper shows that cooperation emerges not from altruism but from the "shadow of the future": the prospect of repeated interaction makes reciprocity individually rational.',
        type: 'summary',
      },
      veritasScore: {
        overallScore: 95,
        confidence: 0.94,
        label: 'exceptional',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 97,
            weight: 0.2,
            evidence: 'Science is one of the two most prestigious multidisciplinary journals',
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 97,
            weight: 0.25,
            evidence: 'Over 15,000 citations; one of the most-cited papers in social science',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 92,
            weight: 0.2,
            evidence:
              'Axelrod is a MacArthur Fellow; Hamilton is a legendary evolutionary theorist',
            source: 'OpenAlex',
          },
          {
            name: 'Methodology',
            score: 93,
            weight: 0.2,
            evidence:
              'Novel computational tournament methodology that became a standard research tool',
            source: 'Semantic Scholar',
          },
          {
            name: 'Currency',
            score: 85,
            weight: 0.15,
            evidence: 'Published 1981; continues to be extended and refined',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'journal_article',
      title: 'Five Rules for the Evolution of Cooperation',
      authors: [{ firstName: 'Martin', middleName: 'A.', lastName: 'Nowak' }],
      year: 2006,
      metadata: {
        doi: '10.1126/science.1133755',
        journal: 'Science',
        volume: '314',
        issue: '5805',
        pages: '1560-1563',
        publisher: 'AAAS',
      },
      tagKey: 'cooperation',
      annotation: {
        content:
          'Nowak synthesizes decades of theoretical work on cooperation into five unifying mechanisms: kin selection, direct reciprocity, indirect reciprocity (reputation), network reciprocity (spatial structure), and group selection. For each mechanism, he provides the critical condition under which natural selection favors cooperators over defectors. This paper serves as the standard reference for the taxonomy of cooperative mechanisms in evolutionary biology.',
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
            evidence: 'Science; top-tier multidisciplinary journal',
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 93,
            weight: 0.25,
            evidence: 'Over 4000 citations; standard reference for cooperation theory',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 90,
            weight: 0.2,
            evidence: "Nowak directs Harvard's Program for Evolutionary Dynamics",
            source: 'OpenAlex',
          },
          {
            name: 'Methodology',
            score: 88,
            weight: 0.2,
            evidence: 'Elegant mathematical synthesis unifying disparate models',
            source: 'Semantic Scholar',
          },
          {
            name: 'Currency',
            score: 85,
            weight: 0.15,
            evidence: 'Published 2006; some debate on group selection mechanism',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'journal_article',
      title: 'Altruistic Punishment in Humans',
      authors: [
        { firstName: 'Ernst', lastName: 'Fehr' },
        { firstName: 'Simon', lastName: 'Gächter' },
      ],
      year: 2002,
      metadata: {
        journal: 'Nature',
        volume: '415',
        pages: '137-140',
        publisher: 'Nature Publishing Group',
      },
      tagKey: 'cooperation',
      annotation: {
        content:
          'Fehr and Gächter demonstrate experimentally that humans will incur personal costs to punish free-riders even in one-shot anonymous interactions where no future benefit is possible. This "altruistic punishment" sustains cooperation in public goods games far more effectively than its absence. The finding challenges pure self-interest models and suggests that humans possess evolved or culturally acquired preferences for norm enforcement.',
        type: 'summary',
      },
      veritasScore: {
        overallScore: 92,
        confidence: 0.92,
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
            score: 95,
            weight: 0.25,
            evidence: 'Over 5000 citations; defined the field of altruistic punishment',
            source: 'Semantic Scholar',
          },
          {
            name: 'Methodology',
            score: 90,
            weight: 0.2,
            evidence: 'Clean experimental design with public goods game and punishment option',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 90,
            weight: 0.2,
            evidence: 'Fehr is one of the most-cited behavioral economists in the world',
            source: 'OpenAlex',
          },
          {
            name: 'Currency',
            score: 82,
            weight: 0.15,
            evidence: 'Published 2002; extensively replicated and extended',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'journal_article',
      title: 'A Theory of Fairness, Competition, and Cooperation',
      authors: [
        { firstName: 'Ernst', lastName: 'Fehr' },
        { firstName: 'Klaus', middleName: 'M.', lastName: 'Schmidt' },
      ],
      year: 1999,
      metadata: {
        doi: '10.1162/003355399556151',
        journal: 'Quarterly Journal of Economics',
        volume: '114',
        issue: '3',
        pages: '817-868',
        publisher: 'MIT Press',
      },
      tagKey: 'cooperation',
      notes:
        'Introduces the inequity aversion model. People dislike outcomes where they get less than others (disadvantageous inequity) or more than others (advantageous inequity). Foundation for behavioral economics of fairness.',
      annotation: {
        content:
          'Fehr and Schmidt develop a formal model of "inequity aversion" in which people dislike both disadvantageous and advantageous inequality in outcomes. They show that even a minority of inequity-averse agents can sustain cooperation and punish defectors in environments where purely self-interested agents would defect. The model successfully predicts behavior across a wide range of experimental games and has become a standard tool in behavioral economics.',
        type: 'evaluative',
      },
      veritasScore: {
        overallScore: 93,
        confidence: 0.93,
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
            name: 'Citation Impact',
            score: 96,
            weight: 0.25,
            evidence: 'Over 10,000 citations; one of the most-cited papers in behavioral economics',
            source: 'Semantic Scholar',
          },
          {
            name: 'Methodology',
            score: 90,
            weight: 0.2,
            evidence: 'Formal utility model with strong predictive power across games',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 92,
            weight: 0.2,
            evidence: 'Fehr at University of Zurich; Schmidt at University of Munich',
            source: 'OpenAlex',
          },
          {
            name: 'Currency',
            score: 82,
            weight: 0.15,
            evidence: 'Published 1999; remains the dominant inequity aversion model',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'book',
      title: 'Why We Cooperate',
      authors: [{ firstName: 'Michael', lastName: 'Tomasello' }],
      year: 2009,
      metadata: { publisher: 'MIT Press' },
      tagKey: 'cooperation',
      annotation: {
        content:
          'Based on his Boston Tanner Lectures, Tomasello presents experimental evidence that human children display cooperative, helpful behavior from as early as 14 months—before socialization can fully account for it. He argues that humans possess a unique suite of cognitive and motivational adaptations for shared intentionality, joint attention, and cooperative communication that distinguishes them from other great apes and underlies human culture and institutions.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title: 'A Cooperative Species: Human Reciprocity and Its Evolution',
      authors: [
        { firstName: 'Samuel', lastName: 'Bowles' },
        { firstName: 'Herbert', lastName: 'Gintis' },
      ],
      year: 2011,
      metadata: { publisher: 'Princeton University Press' },
      tagKey: 'cooperation',
      notes:
        'Strong empirical case that human cooperation goes far beyond what kin selection or reciprocal altruism can explain. Argues for gene-culture coevolution of "strong reciprocity."',
      annotation: {
        content:
          'Bowles and Gintis argue that human cooperation exceeds what kin selection and reciprocal altruism can explain, proposing "strong reciprocity"—a predisposition to cooperate with cooperators and punish defectors even at personal cost. They present evidence from behavioral experiments, ethnographic data, and gene-culture coevolutionary models showing that intergroup competition and cultural institutions amplified prosocial preferences over human evolutionary history.',
        type: 'critical',
      },
    },
    {
      entryType: 'book',
      title: 'Big Gods: How Religion Transformed Cooperation and Conflict',
      authors: [{ firstName: 'Ara', lastName: 'Norenzayan' }],
      year: 2013,
      metadata: { publisher: 'Princeton University Press' },
      tagKey: 'cooperation',
      annotation: {
        content:
          'Norenzayan argues that belief in morally concerned, omniscient "Big Gods" helped scale human cooperation beyond small kin-based groups to the large anonymous societies of the modern world. Drawing on experimental, anthropological, and historical evidence, he proposes that religious surveillance beliefs served as a cultural mechanism for sustaining prosocial behavior among strangers, though secular institutions can and do substitute for this function in modern democracies.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'book',
      title:
        'The Secret of Our Success: How Culture Is Driving Human Evolution, Domesticating Our Species, and Making Us Smarter',
      authors: [{ firstName: 'Joseph', lastName: 'Henrich' }],
      year: 2015,
      metadata: { publisher: 'Princeton University Press' },
      isFavorite: true,
      tagKey: 'cooperation',
      annotation: {
        content:
          'Henrich argues that cumulative cultural evolution—not individual intelligence—is the "secret" of human ecological dominance. He shows how cultural learning, prestige-biased imitation, and norm-enforcement institutions allowed humans to adapt to diverse environments and build complex cooperative structures. The book provides a synthesis of cultural evolution theory that connects evolutionary biology to the social sciences and has implications for understanding institutional design.',
        type: 'summary',
      },
    },
    {
      entryType: 'journal_article',
      title: 'The Weirdest People in the World?',
      authors: [
        { firstName: 'Joseph', lastName: 'Henrich' },
        { firstName: 'Steven', middleName: 'J.', lastName: 'Heine' },
        { firstName: 'Ara', lastName: 'Norenzayan' },
      ],
      year: 2010,
      metadata: {
        journal: 'Behavioral and Brain Sciences',
        volume: '33',
        issue: '2-3',
        pages: '61-83',
        publisher: 'Cambridge University Press',
      },
      tagKey: 'cooperation',
      notes:
        "WEIRD = Western, Educated, Industrialized, Rich, Democratic. Landmark methodological critique showing that psychology's findings are based on a narrow, unrepresentative slice of humanity.",
      annotation: {
        content:
          'Henrich, Heine, and Norenzayan demonstrate that the vast majority of behavioral science research draws subjects from "WEIRD" societies (Western, Educated, Industrialized, Rich, Democratic), which represent a narrow and often outlier slice of human psychological diversity. They show that WEIRD subjects are unusual on measures of visual perception, fairness, cooperation, reasoning, and self-concept. The paper is a foundational methodological critique that has reshaped how social scientists think about generalizability.',
        type: 'critical',
      },
      veritasScore: {
        overallScore: 91,
        confidence: 0.91,
        label: 'exceptional',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 88,
            weight: 0.15,
            evidence: 'BBS is a high-impact interdisciplinary journal with open peer commentary',
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 97,
            weight: 0.3,
            evidence:
              'Over 7000 citations; one of the most-cited methodological critiques in social science',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 88,
            weight: 0.2,
            evidence: 'Henrich at Harvard; all three are leading cultural psychologists',
            source: 'OpenAlex',
          },
          {
            name: 'Methodology',
            score: 90,
            weight: 0.2,
            evidence: 'Systematic review across multiple domains with cross-cultural data',
            source: 'Semantic Scholar',
          },
          {
            name: 'Currency',
            score: 88,
            weight: 0.15,
            evidence: 'Published 2010; catalyzed major shift toward cross-cultural sampling',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'book',
      title: 'Mutual Aid: A Factor of Evolution',
      authors: [{ firstName: 'Peter', lastName: 'Kropotkin' }],
      year: 1902,
      metadata: { publisher: 'Public domain (various modern editions)' },
      tagKey: 'cooperation',
      annotation: {
        content:
          'Kropotkin, a Russian anarchist and naturalist, challenges the "survival of the fittest" interpretation of Darwinism by documenting extensive cooperation within and across species—from ants to medieval guilds. He argues that mutual aid is as much a factor of evolution as competition, and that human progress depends more on solidarity than on struggle. Though predating modern evolutionary theory, the book anticipates multilevel selection and remains a touchstone for cooperative economics.',
        type: 'reflective',
      },
    },
    {
      entryType: 'book',
      title: 'Mothers and Others: The Evolutionary Origins of Mutual Understanding',
      authors: [{ firstName: 'Sarah', middleName: 'Blaffer', lastName: 'Hrdy' }],
      year: 2009,
      metadata: { publisher: 'Harvard University Press' },
      tagKey: 'cooperation',
      annotation: {
        content:
          'Hrdy proposes the "cooperative breeding hypothesis": that the distinctive human capacities for empathy, shared intentionality, and intersubjectivity evolved because human mothers, unlike other ape mothers, relied on allomothers (fathers, grandmothers, siblings) to help raise costly, slow-developing offspring. This cooperative childcare selected for psychological traits that later enabled large-scale human cooperation.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title: 'The Gift: The Form and Reason for Exchange in Archaic Societies',
      authors: [{ firstName: 'Marcel', lastName: 'Mauss' }],
      year: 1925,
      metadata: { publisher: 'Various modern editions (Routledge, W.W. Norton)' },
      tagKey: 'cooperation',
      annotation: {
        content:
          "Mauss's classic anthropological essay analyzes gift exchange in Polynesian, Melanesian, and Northwest Coast societies, arguing that gifts create binding social obligations—to give, to receive, and to reciprocate—that form the foundation of social solidarity. He shows that in pre-market societies, economic exchange is inseparable from moral, religious, and political relations. The work is foundational for understanding non-market forms of distribution and reciprocity.",
        type: 'reflective',
      },
    },
    {
      entryType: 'book',
      title: 'The Gift Relationship: From Human Blood to Social Policy',
      authors: [{ firstName: 'Richard', middleName: 'M.', lastName: 'Titmuss' }],
      year: 1970,
      metadata: { publisher: 'Allen & Unwin (reissued by New Press)' },
      tagKey: 'cooperation',
      annotation: {
        content:
          'Titmuss compares the voluntary British blood donation system with the commercialized American system, finding that the voluntary system produced safer blood, less waste, and more equitable access. He argues that commodifying blood (and by extension, other social goods) crowds out altruistic motivation and corrodes social solidarity. The book became a foundational text in social policy for the argument that markets can undermine prosocial behavior.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'journal_article',
      title: 'Evolutionary Games and Spatial Chaos',
      authors: [
        { firstName: 'Martin', middleName: 'A.', lastName: 'Nowak' },
        { firstName: 'Robert', middleName: 'M.', lastName: 'May' },
      ],
      year: 1992,
      metadata: {
        journal: 'Nature',
        volume: '359',
        pages: '826-829',
        publisher: 'Nature Publishing Group',
      },
      tagKey: 'cooperation',
      annotation: {
        content:
          'Nowak and May show that when agents interact on a spatial lattice rather than mixing randomly, cooperators can survive and even thrive by forming clusters that resist invasion by defectors. This "spatial reciprocity" mechanism requires no memory, recognition, or strategic sophistication—only local interaction. The paper launched the field of evolutionary games on networks and demonstrated that population structure is a key driver of cooperative outcomes.',
        type: 'summary',
      },
      veritasScore: {
        overallScore: 90,
        confidence: 0.9,
        label: 'exceptional',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 98,
            weight: 0.2,
            evidence: 'Nature; top-tier multidisciplinary journal',
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 93,
            weight: 0.25,
            evidence: 'Over 3500 citations; founded the field of spatial evolutionary games',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 90,
            weight: 0.2,
            evidence:
              'Nowak at Harvard; May was President of the Royal Society and Chief Scientific Adviser to the UK Government',
            source: 'OpenAlex',
          },
          {
            name: 'Methodology',
            score: 88,
            weight: 0.2,
            evidence: 'Elegant computational model with clear analytical results',
            source: 'Semantic Scholar',
          },
          {
            name: 'Currency',
            score: 82,
            weight: 0.15,
            evidence: 'Published 1992; framework extensively developed since',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'journal_article',
      title:
        'Altruistic Punishing and Helping Differ in Sensitivity to Relatedness, Friendship, and Future Interactions',
      authors: [
        { firstName: 'Rick', lastName: "O'Gorman" },
        { firstName: 'David', middleName: 'Sloan', lastName: 'Wilson' },
        { firstName: 'Ralph', middleName: 'R.', lastName: 'Miller' },
      ],
      year: 2005,
      metadata: {
        journal: 'Evolution and Human Behavior',
        volume: '26',
        issue: '5',
        pages: '375-387',
        publisher: 'Elsevier',
      },
      tagKey: 'cooperation',
      annotation: {
        content:
          "O'Gorman, Wilson, and Miller use experimental scenarios to show that altruistic helping and altruistic punishment are governed by different psychological mechanisms with different sensitivities to kinship, friendship, and future interaction. Helping is more sensitive to relational closeness and reciprocity potential, while punishment is more indiscriminate—people punish norm violators even when there is no personal relationship or prospect of future encounters.",
        type: 'evaluative',
      },
    },

    // ============================================================
    // GROUP I: Collective action, trust, social capital (7)
    // ============================================================
    {
      entryType: 'book',
      title: 'Bowling Alone: The Collapse and Revival of American Community',
      authors: [{ firstName: 'Robert', middleName: 'D.', lastName: 'Putnam' }],
      year: 2000,
      metadata: { publisher: 'Simon & Schuster' },
      isFavorite: true,
      tagKey: 'collective-action',
      annotation: {
        content:
          'Putnam documents the decline of civic engagement in the United States over the final third of the 20th century—falling membership in voluntary associations, declining voter turnout, reduced social trust—and links this erosion of "social capital" to negative outcomes in health, education, crime, and governance. He attributes the decline primarily to generational change and television, and argues that rebuilding social capital is essential for democratic vitality.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title: 'Trust: The Social Virtues and the Creation of Prosperity',
      authors: [{ firstName: 'Francis', lastName: 'Fukuyama' }],
      year: 1995,
      metadata: { publisher: 'Free Press / Simon & Schuster' },
      tagKey: 'collective-action',
      annotation: {
        content:
          'Fukuyama argues that social trust—the expectation of cooperative behavior from others—is a form of social capital that profoundly shapes economic development. Comparing high-trust societies (Japan, Germany, the US) with lower-trust societies (China, Italy, France), he contends that spontaneous sociability and trust enable the formation of large-scale voluntary organizations essential for competitive economies. The book connects cultural variables to institutional and economic outcomes.',
        type: 'critical',
      },
    },
    {
      entryType: 'book',
      title: 'Social Traps and the Problem of Trust',
      authors: [{ firstName: 'Bo', lastName: 'Rothstein' }],
      year: 2005,
      metadata: { publisher: 'Cambridge University Press' },
      tagKey: 'collective-action',
      notes:
        "Rothstein's key theoretical contribution: universal welfare institutions create social trust (not the reverse). Trust is an outcome of institutional design, not a cultural given.",
      annotation: {
        content:
          'Rothstein develops a theory of "social traps" in which rational individuals fail to cooperate because they lack confidence that others will do the same, even when mutual cooperation would benefit everyone. He argues that the solution lies in institutional design: universal, impartial government institutions generate social trust by credibly signaling that others are contributing fairly. The book provides the theoretical foundation for his later work on welfare state design and corruption.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title:
        'The Quality of Government: Corruption, Social Trust, and Inequality in International Perspective',
      authors: [{ firstName: 'Bo', lastName: 'Rothstein' }],
      year: 2011,
      metadata: { publisher: 'University of Chicago Press' },
      tagKey: 'collective-action',
      annotation: {
        content:
          'Rothstein argues that the quality of government—defined as impartiality in the exercise of public power—is the master variable explaining cross-national variation in social trust, health, happiness, economic growth, and environmental sustainability. He presents extensive empirical evidence that government impartiality matters more than democratic procedures per se, and that corruption and particularism are the central obstacles to human well-being globally.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'journal_article',
      title: 'All for All: Equality, Corruption, and Social Trust',
      authors: [
        { firstName: 'Bo', lastName: 'Rothstein' },
        { firstName: 'Eric', middleName: 'M.', lastName: 'Uslaner' },
      ],
      year: 2005,
      metadata: {
        doi: '10.1353/wp.2006.0022',
        journal: 'World Politics',
        volume: '58',
        issue: '1',
        pages: '41-72',
        publisher: 'Cambridge University Press',
      },
      tagKey: 'collective-action',
      annotation: {
        content:
          'Rothstein and Uslaner present a model of a "social trap" in which inequality and corruption mutually reinforce low social trust, creating a vicious cycle. They argue that only universal welfare policies—not targeted programs—can break this cycle by reducing inequality and signaling government impartiality. The paper provides cross-national empirical evidence linking universal social programs to higher trust and lower corruption.',
        type: 'summary',
      },
    },
    {
      entryType: 'journal_article',
      title: 'The New Politics of the Welfare State',
      authors: [{ firstName: 'Paul', lastName: 'Pierson' }],
      year: 1996,
      metadata: {
        journal: 'World Politics',
        volume: '48',
        issue: '2',
        pages: '143-179',
        publisher: 'Cambridge University Press',
      },
      tagKey: 'collective-action',
      annotation: {
        content:
          'Pierson argues that welfare state retrenchment operates under a fundamentally different political logic than welfare state expansion. Because cutting popular programs generates concentrated losses and diffuse gains, politicians pursue strategies of blame avoidance and obfuscation rather than credit claiming. The paper is foundational for understanding why welfare states are resilient and how "path dependency" shapes social policy possibilities.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'book',
      title: 'The Logic of Collective Action: Public Goods and the Theory of Groups',
      authors: [{ firstName: 'Mancur', lastName: 'Olson' }],
      year: 1965,
      metadata: { publisher: 'Harvard University Press' },
      tagKey: 'collective-action',
      customFields: { 'Reading Status': 'completed' },
      annotation: {
        content:
          "Olson demonstrates that rational self-interest alone cannot explain collective action to provide public goods: individuals have incentives to free-ride on others' contributions, so large groups will under-provide shared benefits unless coercion or selective incentives overcome the free-rider problem. This insight became one of the most important results in political economy, directly motivating Ostrom's later work showing how communities actually do solve collective action problems.",
        type: 'reflective',
      },
    },

    // ============================================================
    // GROUP J: Welfare-state design + public support/attitudes (17)
    // ============================================================
    {
      entryType: 'book',
      title: 'The Three Worlds of Welfare Capitalism',
      authors: [{ firstName: 'Gøsta', lastName: 'Esping-Andersen' }],
      year: 1990,
      metadata: { publisher: 'Princeton University Press' },
      isFavorite: true,
      tagKey: 'welfare',
      customFields: { Priority: 'high' },
      annotation: {
        content:
          'Esping-Andersen classifies welfare states into three regime types—liberal (Anglo-Saxon), conservative-corporatist (Continental European), and social-democratic (Scandinavian)—based on the degree of "decommodification" (the extent to which citizens can maintain a livelihood without relying on the market). This typology remains the dominant framework for comparative welfare state analysis and has generated decades of empirical testing and theoretical extension.',
        type: 'summary',
      },
    },
    {
      entryType: 'book',
      title: 'Fighting Poverty in the U.S. and Europe: A World of Difference',
      authors: [
        { firstName: 'Alberto', lastName: 'Alesina' },
        { firstName: 'Edward', middleName: 'L.', lastName: 'Glaeser' },
      ],
      year: 2004,
      metadata: { publisher: 'Oxford University Press' },
      tagKey: 'welfare',
      annotation: {
        content:
          'Alesina and Glaeser explain why the United States has a much less generous welfare state than Europe, arguing that racial and ethnic diversity—and the political exploitation of racial resentment—is the primary explanation rather than differences in economic self-interest or values. They show that ethnic fractionalization predicts lower social spending cross-nationally and that racial politics specifically undermined support for redistribution in the U.S.',
        type: 'critical',
      },
    },
    {
      entryType: 'book',
      title: 'Why Americans Hate Welfare: Race, Media, and the Politics of Antipoverty Policy',
      authors: [{ firstName: 'Martin', lastName: 'Gilens' }],
      year: 1999,
      metadata: { publisher: 'University of Chicago Press' },
      tagKey: 'welfare',
      annotation: {
        content:
          "Gilens demonstrates that white Americans' opposition to welfare is driven primarily by the perception that it benefits undeserving Black recipients rather than by principled opposition to redistribution or government spending. He shows that media portrayals of poverty became increasingly racialized from the 1960s onward, and that misperceptions about the racial composition of welfare recipients predict opposition to welfare programs.",
        type: 'summary',
      },
    },
    {
      entryType: 'journal_article',
      title:
        'Who Should Get What, and Why? On Deservingness Criteria and the Conditionality of Solidarity Among the Public',
      authors: [{ firstName: 'Wim', lastName: 'van Oorschot' }],
      year: 2000,
      metadata: {
        journal: 'Policy & Politics',
        volume: '28',
        issue: '1',
        pages: '33-48',
        publisher: 'Policy Press',
      },
      tagKey: 'welfare',
      annotation: {
        content:
          'Van Oorschot identifies five criteria that shape public perceptions of who "deserves" welfare support: control (whether the need is self-caused), identity (similarity to the perceiver), attitude (gratitude and compliance), reciprocity (past and future contributions), and need (severity of deprivation). He finds a stable "deservingness hierarchy" across European countries: elderly > sick/disabled > unemployed > immigrants. This "CARIN" framework became the standard for studying welfare attitudes.',
        type: 'summary',
      },
    },
    {
      entryType: 'journal_article',
      title: 'The CARIN Deservingness Principles Scale: A Comparative Perspective',
      authors: [{ firstName: 'Bart', lastName: 'Meuleman' }],
      year: 2020,
      metadata: { journal: 'Social Science Research', publisher: 'Elsevier' },
      tagKey: 'welfare',
      annotation: {
        content:
          'Meuleman and colleagues develop and validate a psychometric scale for measuring the five CARIN deservingness criteria (Control, Attitude, Reciprocity, Identity, Need) across European countries. The scale enables standardized measurement of how individuals weight different deservingness criteria, facilitating cross-national comparison of welfare attitudes and their relationship to welfare regime types.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'journal_article',
      title: 'A Recast Framework for Welfare Deservingness Perceptions',
      authors: [{ firstName: 'Carlo', middleName: 'Michael', lastName: 'Knotz' }],
      year: 2021,
      metadata: { publisher: 'Social Policy & Society / PMC' },
      tagKey: 'welfare',
      annotation: {
        content:
          "Knotz and colleagues propose a revised framework for understanding welfare deservingness perceptions that extends beyond van Oorschot's CARIN criteria. They argue that deservingness judgments are context-dependent, shaped by institutional features, media framing, and political mobilization. The paper synthesizes two decades of empirical findings and provides updated theoretical guidance for researching public support for social programs.",
        type: 'critical',
      },
    },
    {
      entryType: 'journal_article',
      title:
        'Deservingness versus Values in Public Opinion on Welfare: The Automaticity of the Deservingness Heuristic',
      authors: [{ firstName: 'Michael', middleName: 'Bang', lastName: 'Petersen' }],
      year: 2010,
      metadata: { journal: 'European Journal of Political Research', publisher: 'Wiley' },
      tagKey: 'welfare',
      annotation: {
        content:
          'Petersen and colleagues use experimental methods to show that deservingness judgments operate as automatic cognitive heuristics rather than deliberated value applications. When people evaluate welfare recipients, they rapidly and intuitively assess cues related to effort, need, and reciprocity, often overriding their stated ideological commitments. This finding has important implications for understanding why welfare attitudes can be so resistant to political messaging.',
        type: 'summary',
      },
    },
    {
      entryType: 'journal_article',
      title:
        'The Paradox of Redistribution and Strategies of Equality: Welfare State Institutions, Inequality, and Poverty in the Western Countries',
      authors: [
        { firstName: 'Walter', lastName: 'Korpi' },
        { firstName: 'Joakim', lastName: 'Palme' },
      ],
      year: 1998,
      metadata: {
        doi: '10.2307/2657333',
        journal: 'American Sociological Review',
        volume: '63',
        issue: '5',
        pages: '661-687',
        publisher: 'American Sociological Association',
      },
      isFavorite: true,
      tagKey: 'welfare',
      annotation: {
        content:
          'Korpi and Palme demonstrate the "paradox of redistribution": countries with universal welfare programs (covering the middle class, not just the poor) achieve greater poverty reduction than countries with targeted, means-tested programs aimed directly at the poor. Universal programs build broader political coalitions, generate more revenue, and provide larger absolute transfers to the poor. This is one of the most important findings in comparative welfare state research.',
        type: 'summary',
      },
      veritasScore: {
        overallScore: 88,
        confidence: 0.89,
        label: 'high',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 90,
            weight: 0.2,
            evidence: 'ASR is the flagship journal of the American Sociological Association',
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 92,
            weight: 0.25,
            evidence: 'Over 2000 citations; defined the "paradox of redistribution" concept',
            source: 'Semantic Scholar',
          },
          {
            name: 'Methodology',
            score: 85,
            weight: 0.2,
            evidence: 'Cross-national comparative analysis of 18 OECD countries',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 88,
            weight: 0.2,
            evidence: 'Korpi and Palme at Stockholm University; pioneers of power resources theory',
            source: 'OpenAlex',
          },
          {
            name: 'Currency',
            score: 78,
            weight: 0.15,
            evidence:
              'Published 1998; some later studies debate the paradox under current conditions',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'report',
      title: 'The Paradox of Redistribution Revisited: And That It Did Not Happen',
      authors: [{ firstName: 'Ive', lastName: 'Marx' }],
      year: 2013,
      metadata: { publisher: 'Institute of Labor Economics (IZA)', series: 'IZA Discussion Paper' },
      tagKey: 'welfare',
      annotation: {
        content:
          "Marx and colleagues revisit Korpi and Palme's paradox of redistribution using updated data and find that the relationship between universalism and poverty reduction has weakened in recent decades. They argue that universal programs have become less redistributive as benefit generosity has been cut, and that some targeted programs have become more effective. The paper is an important empirical check on a widely cited finding.",
        type: 'critical',
      },
    },
    {
      entryType: 'journal_article',
      title: "Good-Bye Lenin (or Not?): The Effect of Communism on People's Preferences",
      authors: [
        { firstName: 'Alberto', lastName: 'Alesina' },
        { firstName: 'Nicola', lastName: 'Fuchs-Schündeln' },
      ],
      year: 2007,
      metadata: {
        doi: '10.1257/aer.97.4.1507',
        journal: 'American Economic Review',
        volume: '97',
        issue: '4',
        pages: '1507-1528',
        publisher: 'American Economic Association',
      },
      tagKey: 'welfare',
      annotation: {
        content:
          'Alesina and Fuchs-Schündeln exploit German reunification as a natural experiment to test whether living under communism permanently shifted preferences toward state intervention. They find that East Germans are significantly more pro-redistribution than West Germans, but that this gap narrows over time, suggesting both institutional and cultural channels. The paper provides causal evidence that political systems shape economic preferences, not just the reverse.',
        type: 'summary',
      },
      veritasScore: {
        overallScore: 87,
        confidence: 0.88,
        label: 'high',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 95,
            weight: 0.2,
            evidence: 'AER is the top general-interest economics journal',
            source: 'Semantic Scholar',
          },
          {
            name: 'Methodology',
            score: 88,
            weight: 0.25,
            evidence: 'Natural experiment exploiting German reunification',
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 85,
            weight: 0.2,
            evidence: 'Over 1500 citations; key reference on institutions shaping preferences',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 90,
            weight: 0.2,
            evidence:
              'Alesina at Harvard (one of the most-cited economists); Fuchs-Schündeln at Goethe University',
            source: 'OpenAlex',
          },
          {
            name: 'Currency',
            score: 80,
            weight: 0.15,
            evidence: 'Published 2007; findings confirmed by subsequent research',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'journal_article',
      title: 'Preferences for Redistribution in the Land of Opportunities',
      authors: [
        { firstName: 'Alberto', lastName: 'Alesina' },
        { firstName: 'Eliana', lastName: 'La Ferrara' },
      ],
      year: 2005,
      metadata: {
        journal: 'Journal of Public Economics',
        volume: '89',
        issue: '5-6',
        pages: '897-931',
        publisher: 'Elsevier',
      },
      tagKey: 'welfare',
      annotation: {
        content:
          'Alesina and La Ferrara analyze American attitudes toward redistribution and find that support is lower among those who believe they have good prospects for upward mobility, who believe the economic system is fair, and who are not members of disadvantaged racial or income groups. The paper quantifies the "American exceptionalism" in redistribution preferences and identifies social mobility beliefs as a key mechanism.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'book',
      title: 'Preferences for Redistribution',
      authors: [
        { firstName: 'Alberto', lastName: 'Alesina' },
        { firstName: 'Paola', lastName: 'Giuliano' },
      ],
      year: 2011,
      metadata: { publisher: 'Elsevier', container: 'Handbook of Social Economics', volume: '1A' },
      tagKey: 'welfare',
      annotation: {
        content:
          'This comprehensive handbook chapter surveys the determinants of preferences for redistribution, covering self-interest, social mobility beliefs, fairness perceptions, cultural values, historical experiences, and social identity. Alesina and Giuliano synthesize a vast empirical literature and identify the role of group identity and beliefs about the causes of poverty as the most important factors beyond narrow self-interest.',
        type: 'summary',
      },
    },
    {
      entryType: 'journal_article',
      title: 'Group Loyalty and the Taste for Redistribution',
      authors: [{ firstName: 'Erzo', middleName: 'F. P.', lastName: 'Luttmer' }],
      year: 2001,
      metadata: {
        doi: '10.1086/321019',
        journal: 'Journal of Political Economy',
        volume: '109',
        issue: '3',
        pages: '500-528',
        publisher: 'University of Chicago Press',
      },
      tagKey: 'welfare',
      annotation: {
        content:
          "Luttmer demonstrates that individuals' support for welfare spending is significantly influenced by the racial composition of their local community: exposure to welfare recipients of a different race reduces support for redistribution, even controlling for self-interest. The paper provides micro-level evidence for the racial solidarity hypothesis that Alesina and Glaeser examine at the macro level, showing that in-group/out-group dynamics shape welfare attitudes.",
        type: 'evaluative',
      },
    },
    {
      entryType: 'book',
      title: 'Strong Reciprocity and the Welfare State',
      authors: [
        { firstName: 'Christina', middleName: 'M.', lastName: 'Fong' },
        { firstName: 'Samuel', lastName: 'Bowles' },
        { firstName: 'Herbert', lastName: 'Gintis' },
      ],
      year: 2006,
      metadata: {
        publisher: 'Elsevier',
        container: 'Handbook of the Economics of Giving, Altruism and Reciprocity',
        volume: '2',
      },
      tagKey: 'welfare',
      annotation: {
        content:
          'Fong, Bowles, and Gintis argue that the behavioral foundations of welfare state support lie in "strong reciprocity"—the willingness to cooperate and to punish free-riders at personal cost. They synthesize experimental and survey evidence showing that support for redistribution depends critically on whether recipients are perceived as deserving (making efforts, contributing to society) versus undeserving (lazy, free-riding). This connects evolutionary cooperation theory directly to welfare politics.',
        type: 'reflective',
      },
    },
    {
      entryType: 'report',
      title:
        'Corruption, Happiness, Social Trust and the Welfare State: A Causal Mechanisms Approach',
      authors: [{ firstName: 'Bo', lastName: 'Rothstein' }],
      year: 2010,
      metadata: {
        publisher: 'Quality of Government Institute, University of Gothenburg',
        series: 'QoG Working Paper',
      },
      tagKey: 'welfare',
      annotation: {
        content:
          'Rothstein proposes a causal model linking welfare state design to happiness through the mechanisms of social trust and corruption perceptions. He argues that universal welfare institutions reduce corruption (by minimizing bureaucratic discretion), which increases trust in government, which in turn increases generalized social trust and well-being. The paper provides the theoretical architecture connecting his earlier institutional analysis to subjective well-being outcomes.',
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title: 'The Universal Welfare State as a Social Dilemma',
      authors: [{ firstName: 'Bo', lastName: 'Rothstein' }],
      year: 2001,
      metadata: { publisher: 'Russell Sage Foundation / Working Paper' },
      tagKey: 'welfare',
      notes:
        'Rothstein frames universal welfare as a collective action problem: everyone benefits if all contribute, but each individual is tempted to free-ride. Universal design solves this by making contribution and benefit visible and symmetric.',
      annotation: {
        content:
          'Rothstein frames the universal welfare state as a collective action problem: citizens are willing to pay high taxes if they trust that others will also contribute and that benefits will be distributed fairly. He argues that universal (as opposed to means-tested) program design solves this social dilemma by making contributions and benefits visible, symmetric, and perceived as legitimate. The paper bridges collective action theory with welfare state design.',
        type: 'critical',
      },
    },
    {
      entryType: 'report',
      title: 'Quality of Government and Social Trust: A Causal Mechanisms Approach',
      authors: [{ firstName: 'Peter', middleName: 'Thisted', lastName: 'Dinesen' }],
      year: 2021,
      metadata: { publisher: 'Quality of Government Institute / Academic paper' },
      tagKey: 'welfare',
      annotation: {
        content:
          "Dinesen and colleagues investigate the causal pathways through which government quality affects generalized social trust. Using cross-national and within-country longitudinal data, they find that impartial, non-corrupt government institutions generate trust not only in government but also in fellow citizens. The paper provides the most recent and methodologically rigorous test of Rothstein's theoretical framework linking institutional quality to social trust.",
        type: 'evaluative',
      },
    },

    // ============================================================
    // GROUP K: Health systems, healing, social determinants (12)
    // ============================================================
    {
      entryType: 'report',
      title: 'The World Health Report 2000: Health Systems—Improving Performance',
      authors: [],
      year: 2000,
      metadata: { publisher: 'World Health Organization', url: 'https://www.who.int/whr/2000/en/' },
      tagKey: 'health',
      extraProjectKeys: ['p2-health'],
      annotation: {
        content:
          'This landmark WHO report introduced the first comprehensive framework for evaluating health system performance, ranking 191 countries on responsiveness, fair financing, and health outcomes. Despite methodological controversy (particularly regarding the rankings), it established that health systems have measurable, comparable attributes and catalyzed a global research agenda on health system strengthening and universal coverage.',
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title:
        'The World Health Report 2010: Health Systems Financing—The Path to Universal Coverage',
      authors: [],
      year: 2010,
      metadata: { publisher: 'World Health Organization', url: 'https://www.who.int/whr/2010/en/' },
      tagKey: 'health',
      extraProjectKeys: ['p2-health'],
      annotation: {
        content:
          "The 2010 WHO report makes the case for universal health coverage (UHC) as an achievable goal for all countries, regardless of income level. It identifies three dimensions of coverage (population breadth, service depth, cost protection height) and estimates that 20-40% of health spending globally is wasted. The report provided the intellectual framework that led to UHC's inclusion as a Sustainable Development Goal target.",
        type: 'evaluative',
      },
    },
    {
      entryType: 'journal_article',
      title: 'Health Systems Financing and the Path to Universal Coverage',
      authors: [{ firstName: 'David', middleName: 'B.', lastName: 'Evans' }],
      year: 2010,
      metadata: { journal: 'Bulletin of the World Health Organization', publisher: 'WHO / PMC' },
      tagKey: 'health',
      extraProjectKeys: ['p2-health'],
      annotation: {
        content:
          'Evans and colleagues provide the analytical companion to the 2010 World Health Report, presenting the evidence base for health financing reform toward universal coverage. They analyze how countries at different income levels can increase fiscal space for health, reduce out-of-pocket payments, and improve efficiency. The paper operationalizes UHC financing principles for policymakers.',
        type: 'summary',
      },
    },
    {
      entryType: 'journal_article',
      title: 'Anything Goes on the Path to Universal Health Coverage? No.',
      authors: [{ firstName: 'Joseph', lastName: 'Kutzin' }],
      year: 2012,
      metadata: {
        journal: 'Bulletin of the World Health Organization',
        volume: '90',
        pages: '867-868',
        publisher: 'WHO / PMC',
      },
      tagKey: 'health',
      extraProjectKeys: ['p2-health'],
      annotation: {
        content:
          'Kutzin, WHO\'s lead health financing specialist, clarifies that universal health coverage is not merely about insurance enrollment but about ensuring effective access to needed services without financial hardship. He argues against the misconception that "anything goes" in the path to UHC and emphasizes core principles: prepayment over out-of-pocket spending, risk pooling, strategic purchasing, and compulsory rather than voluntary participation.',
        type: 'critical',
      },
    },
    {
      entryType: 'journal_article',
      title: 'Building Resilient Health Systems: A Proposal for a Resilience Index',
      authors: [{ firstName: 'Margaret', middleName: 'E.', lastName: 'Kruk' }],
      year: 2017,
      metadata: {
        doi: '10.1136/bmj.j2323',
        journal: 'BMJ',
        volume: '357',
        publisher: 'BMJ Publishing Group',
      },
      tagKey: 'health',
      extraProjectKeys: ['p2-health'],
      annotation: {
        content:
          "Kruk and colleagues propose a framework for measuring health system resilience—the capacity to prepare for, absorb, and recover from shocks such as epidemics, natural disasters, or conflict. They develop a resilience index built on five dimensions: awareness, diversity, self-regulation, integration, and adaptiveness. The paper anticipated the COVID-19 pandemic's revelation of health system fragility by three years.",
        type: 'summary',
      },
    },
    {
      entryType: 'journal_article',
      title: 'Global Health 2035: A World Converging Within a Generation',
      authors: [{ firstName: 'Dean', middleName: 'T.', lastName: 'Jamison' }],
      year: 2013,
      metadata: { journal: 'The Lancet', publisher: 'Elsevier' },
      tagKey: 'health',
      extraProjectKeys: ['p2-health'],
      isFavorite: true,
      annotation: {
        content:
          'The Lancet Commission on Investing in Health argues that a "grand convergence" in global health—reducing infectious, maternal, and child mortality in low-income countries to universally low levels—is achievable within a generation with an investment of $23 billion per year. The report makes a powerful economic case for health investment, estimating returns of 9-to-1, and proposes progressive universalism as the financing approach.',
        type: 'summary',
      },
      veritasScore: {
        overallScore: 89,
        confidence: 0.9,
        label: 'high',
        factors: [
          {
            name: 'Publisher Reputation',
            score: 95,
            weight: 0.2,
            evidence: "The Lancet is one of the world's top medical journals",
            source: 'Semantic Scholar',
          },
          {
            name: 'Citation Impact',
            score: 90,
            weight: 0.25,
            evidence: 'Over 1500 citations; influenced WHO and World Bank investment frameworks',
            source: 'Semantic Scholar',
          },
          {
            name: 'Author Credentials',
            score: 88,
            weight: 0.2,
            evidence:
              'Jamison led the Disease Control Priorities project; Commission included Nobel laureates',
            source: 'OpenAlex',
          },
          {
            name: 'Methodology',
            score: 85,
            weight: 0.2,
            evidence: 'Comprehensive modeling of health outcomes and economic returns',
            source: 'Semantic Scholar',
          },
          {
            name: 'Currency',
            score: 82,
            weight: 0.15,
            evidence:
              'Published 2013; trajectory disrupted by COVID-19 but framework remains valid',
            source: 'CrossRef',
          },
        ],
        dataSources: ['Semantic Scholar', 'CrossRef', 'OpenAlex'],
      },
    },
    {
      entryType: 'report',
      title: 'Declaration of Alma-Ata: International Conference on Primary Health Care',
      authors: [],
      year: 1978,
      metadata: {
        publisher: 'World Health Organization',
        url: 'https://www.who.int/docs/default-source/documents/almaata-declaration-en.pdf',
      },
      tagKey: 'health',
      extraProjectKeys: ['p2-health'],
      annotation: {
        content:
          'The 1978 Alma-Ata Declaration proclaimed "Health for All by the Year 2000" and established primary health care (PHC) as the key strategy for achieving equitable health outcomes. It defined PHC broadly to include education, nutrition, water, sanitation, maternal/child health, immunization, essential drugs, and disease prevention. The declaration was the foundational document for the global primary health care movement, though its ambitious goals remained largely unmet.',
        type: 'reflective',
      },
    },
    {
      entryType: 'report',
      title: 'Declaration of Astana: Global Conference on Primary Health Care',
      authors: [],
      year: 2018,
      metadata: {
        publisher: 'World Health Organization',
        url: 'https://www.who.int/docs/default-source/primary-health/declaration/gcphc-declaration.pdf',
      },
      tagKey: 'health',
      extraProjectKeys: ['p2-health'],
      annotation: {
        content:
          'The Astana Declaration renewed the global commitment to primary health care 40 years after Alma-Ata, updating the PHC vision for the 21st century. It emphasizes primary care as the foundation for achieving universal health coverage and the SDGs, and highlights digital health, multisectoral action, and community empowerment. The declaration signaled a renewed political commitment to PHC-centered health system design.',
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title: 'Social Insurance and Allied Services (The Beveridge Report)',
      authors: [{ firstName: 'William', lastName: 'Beveridge' }],
      year: 1942,
      metadata: {
        publisher: "His Majesty's Stationery Office",
        url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2560775/',
      },
      tagKey: 'health',
      extraProjectKeys: ['p2-health'],
      annotation: {
        content:
          'Beveridge\'s wartime report proposed a comprehensive social insurance system to slay the "five giants" of Want, Disease, Ignorance, Squalor, and Idleness. It recommended universal, flat-rate social insurance from "cradle to grave," including a free National Health Service. The report became the blueprint for the British welfare state and the NHS, and its universalist principles influenced social policy design worldwide.',
        type: 'reflective',
      },
    },
    {
      entryType: 'journal_article',
      title: 'The Health Gap: The Challenge of an Unequal World',
      authors: [{ firstName: 'Michael', lastName: 'Marmot' }],
      year: 2015,
      metadata: {
        doi: '10.1016/S0140-6736(15)00150-6',
        journal: 'The Lancet',
        publisher: 'Elsevier',
      },
      tagKey: 'health',
      extraProjectKeys: ['p2-health'],
      notes:
        'Marmot demonstrates the social gradient in health: health outcomes follow a gradient across all levels of socioeconomic status, not just a threshold between rich and poor.',
      annotation: {
        content:
          'Marmot demonstrates that health inequalities follow a "social gradient"—every step up in socioeconomic status corresponds to better health outcomes—across all countries, not just between rich and poor. He argues that these health gaps are driven by conditions of daily life (early childhood, education, employment, housing) and the structural forces that shape them. The paper synthesizes decades of social determinants research and calls for "proportionate universalism" in health policy.',
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title: 'Fair Society, Healthy Lives: The Marmot Review',
      authors: [{ firstName: 'Michael', lastName: 'Marmot' }],
      year: 2010,
      metadata: {
        publisher: 'Institute of Health Equity',
        url: 'https://www.instituteofhealthequity.org/resources-reports/fair-society-healthy-lives-the-marmot-review',
      },
      tagKey: 'health',
      extraProjectKeys: ['p2-health'],
      annotation: {
        content:
          'Commissioned by the UK government, the Marmot Review identifies six policy objectives for reducing health inequalities: giving every child the best start in life, enabling all to maximize capabilities, ensuring fair employment and good work, ensuring a healthy standard of living for all, creating healthy and sustainable communities, and strengthening prevention. It introduced "proportionate universalism"—universal policies with a scale and intensity proportionate to the level of disadvantage.',
        type: 'evaluative',
      },
    },
    {
      entryType: 'journal_article',
      title: 'The 2018 Astana Declaration on Primary Health Care, Is It Useful?',
      authors: [{ firstName: 'Gijs', lastName: 'Walraven' }],
      year: 2019,
      metadata: {
        journal: 'Journal of Global Health',
        publisher: 'PMC / Edinburgh University Global Health Society',
      },
      tagKey: 'health',
      extraProjectKeys: ['p2-health'],
      annotation: {
        content:
          'Walraven provides a critical assessment of the 2018 Astana Declaration, comparing it to the original Alma-Ata vision. He argues that while Astana usefully reaffirmed global commitment to primary health care, it lacked the bold specificity of Alma-Ata, offered few concrete mechanisms for accountability, and risked becoming a symbolic gesture without teeth. The article is a useful critical companion piece to the declaration itself.',
        type: 'critical',
      },
    },

    // ============================================================
    // GROUP L: Species trajectory & macro forces (4)
    // ============================================================
    {
      entryType: 'report',
      title: 'Global Trends 2040: A More Contested World',
      authors: [],
      year: 2021,
      metadata: {
        publisher: 'National Intelligence Council',
        url: 'https://www.dni.gov/files/ODNI/documents/assessments/GlobalTrends_2040.pdf',
      },
      tagKey: 'trajectory',
      extraProjectKeys: ['p2-health'],
      annotation: {
        content:
          'The U.S. National Intelligence Council\'s quadrennial foresight report identifies five key structural forces (demographics, environment, economics, technology, governance) and models five scenarios for 2040 ranging from a "Renaissance of Democracies" to "Tragedy and Mobilization" (near-catastrophe triggers cooperation). The report is notable for its frank assessment that the current trajectory leads to increasing contestation, fragmentation, and state-society tension globally.',
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title: 'World Population Prospects 2024',
      authors: [],
      year: 2024,
      metadata: {
        publisher: 'United Nations Department of Economic and Social Affairs',
        url: 'https://population.un.org/wpp/',
      },
      tagKey: 'trajectory',
      extraProjectKeys: ['p2-health'],
      annotation: {
        content:
          "The UN's authoritative population projections estimate that global population will peak around 10.3 billion in the mid-2080s before declining, with significant regional variation: sub-Saharan Africa will more than double while Europe and East Asia will shrink substantially. The projections have major implications for labor markets, fiscal sustainability, migration pressures, and resource consumption—all central to the welfare state and cooperation literatures.",
        type: 'evaluative',
      },
    },
    {
      entryType: 'report',
      title: 'Climate Change 2023: Synthesis Report (AR6)',
      authors: [],
      year: 2023,
      metadata: {
        publisher: 'Intergovernmental Panel on Climate Change',
        url: 'https://www.ipcc.ch/report/ar6/syr/',
      },
      tagKey: 'trajectory',
      extraProjectKeys: ['p2-health'],
      isFavorite: true,
      annotation: {
        content:
          "The IPCC's Sixth Assessment Synthesis Report represents the scientific consensus on climate change, finding that human activities have unequivocally warmed the planet by 1.1°C, that every increment of warming increases risks of cascading and irreversible impacts, and that deep, rapid emissions reductions are needed across all sectors. It concludes that the window for limiting warming to 1.5°C is rapidly closing and that climate justice requires support for vulnerable nations.",
        type: 'summary',
      },
    },
    {
      entryType: 'report',
      title: 'The Global Risks Report 2026',
      authors: [],
      year: 2026,
      metadata: {
        publisher: 'World Economic Forum',
        url: 'https://www.weforum.org/publications/global-risks-report-2026/',
      },
      tagKey: 'trajectory',
      extraProjectKeys: ['p2-health'],
      annotation: {
        content:
          'The WEF Global Risks Report surveys over 900 experts on the most severe risks over 2- and 10-year horizons. It consistently identifies environmental risks (extreme weather, biodiversity loss, resource crises), technological risks (AI misinformation, cyber insecurity), and geopolitical risks (interstate conflict, societal polarization) as the dominant threats. The report provides a useful snapshot of how global elites perceive systemic risk and the inadequacy of current cooperative frameworks.',
        type: 'critical',
      },
    },
  ],
}
