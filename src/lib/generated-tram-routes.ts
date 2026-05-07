export type GeneratedSurfaceStop = {
  name: string;
  locality: string;
  position: [number, number];
};

export type GeneratedTramRouteBundle = {
  routeLabel: string;
  longName: string;
  color: string;
  forwardDestination: string;
  reverseDestination: string;
  forwardStops: GeneratedSurfaceStop[];
  reverseStops: GeneratedSurfaceStop[];
};

export const GENERATED_TRAM_ROUTE_BUNDLES: GeneratedTramRouteBundle[] = [
  {
    "routeLabel": "12",
    "longName": "St Kilda (Fitzroy St) - Victoria Gardens",
    "color": "007E92",
    "forwardDestination": "Victoria Gardens",
    "reverseDestination": "Fitzroy Street - Stop 143",
    "forwardStops": [
      {
        "name": "Fitzroy St/Park St #143",
        "locality": "PTV GTFS",
        "position": [
          -37.86098764,
          144.97445338
        ]
      },
      {
        "name": "Mary St/Park St #142",
        "locality": "PTV GTFS",
        "position": [
          -37.85979438,
          144.97319027
        ]
      },
      {
        "name": "Deakin St/Park St #141",
        "locality": "PTV GTFS",
        "position": [
          -37.85749103,
          144.97078692
        ]
      },
      {
        "name": "Fraser St/Park St #140",
        "locality": "PTV GTFS",
        "position": [
          -37.85575684,
          144.96742472
        ]
      },
      {
        "name": "Langridge St/Patterson St #139",
        "locality": "PTV GTFS",
        "position": [
          -37.85478788,
          144.96558736
        ]
      },
      {
        "name": "Armstrong St/Danks St #138",
        "locality": "PTV GTFS",
        "position": [
          -37.85307549,
          144.96245211
        ]
      },
      {
        "name": "Harold St/Danks St #137",
        "locality": "PTV GTFS",
        "position": [
          -37.85136066,
          144.9591807
        ]
      },
      {
        "name": "Mills St/Danks St #136",
        "locality": "PTV GTFS",
        "position": [
          -37.84973878,
          144.95607734
        ]
      },
      {
        "name": "Richardson St/Mills St #135",
        "locality": "PTV GTFS",
        "position": [
          -37.84740974,
          144.95740312
        ]
      },
      {
        "name": "Carter St/Mills St #134",
        "locality": "PTV GTFS",
        "position": [
          -37.84559686,
          144.95887368
        ]
      },
      {
        "name": "Canterbury Rd/Mills St #133",
        "locality": "PTV GTFS",
        "position": [
          -37.84406865,
          144.96013177
        ]
      },
      {
        "name": "Kerferd Rd/Canterbury Rd #132",
        "locality": "PTV GTFS",
        "position": [
          -37.84245096,
          144.95934679
        ]
      },
      {
        "name": "Melbourne Sports & Aquatic Centre/Albert Rd #131",
        "locality": "PTV GTFS",
        "position": [
          -37.8406882,
          144.96111127
        ]
      },
      {
        "name": "Clarendon St/Albert Rd #130",
        "locality": "PTV GTFS",
        "position": [
          -37.8395201,
          144.96287067
        ]
      },
      {
        "name": "Raglan St/Clarendon St #130a",
        "locality": "PTV GTFS",
        "position": [
          -37.83761364,
          144.96258223
        ]
      },
      {
        "name": "Park St/Clarendon St #129",
        "locality": "PTV GTFS",
        "position": [
          -37.83543357,
          144.96158548
        ]
      },
      {
        "name": "Dorcas St/Clarendon St #128",
        "locality": "PTV GTFS",
        "position": [
          -37.83315343,
          144.96053473
        ]
      },
      {
        "name": "York St/Clarendon St #127",
        "locality": "PTV GTFS",
        "position": [
          -37.83098215,
          144.95952649
        ]
      },
      {
        "name": "City Rd/Clarendon St #126",
        "locality": "PTV GTFS",
        "position": [
          -37.82722256,
          144.95786904
        ]
      },
      {
        "name": "Casino/MCEC/Clarendon St #124A",
        "locality": "PTV GTFS",
        "position": [
          -37.82348898,
          144.95615422
        ]
      },
      {
        "name": "Batman Park/Spencer St #124",
        "locality": "PTV GTFS",
        "position": [
          -37.82155404,
          144.95526467
        ]
      },
      {
        "name": "Spencer St/Collins St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81870592,
          144.95524103
        ]
      },
      {
        "name": "William St/Collins St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81739736,
          144.95980976
        ]
      },
      {
        "name": "Elizabeth St/Collins St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81624916,
          144.9637605
        ]
      },
      {
        "name": "Melbourne Town Hall/Collins St #6",
        "locality": "PTV GTFS",
        "position": [
          -37.81551769,
          144.96627972
        ]
      },
      {
        "name": "Exhibition St/Collins St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.81422456,
          144.97072269
        ]
      },
      {
        "name": "Spring St/Collins St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.81341597,
          144.97348244
        ]
      },
      {
        "name": "Parliament Railway Station/Macarthur St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.81217073,
          144.97443658
        ]
      },
      {
        "name": "Albert St/Gisborne St #11",
        "locality": "PTV GTFS",
        "position": [
          -37.80969458,
          144.97560605
        ]
      },
      {
        "name": "St Vincents Plaza/Victoria Pde #12",
        "locality": "PTV GTFS",
        "position": [
          -37.80821104,
          144.97632809
        ]
      },
      {
        "name": "Lansdowne St/Victoria Pde #13",
        "locality": "PTV GTFS",
        "position": [
          -37.80843491,
          144.97834381
        ]
      },
      {
        "name": "Smith St/Victoria Pde #15",
        "locality": "PTV GTFS",
        "position": [
          -37.80890835,
          144.98282893
        ]
      },
      {
        "name": "Wellington St/Victoria Pde #16",
        "locality": "PTV GTFS",
        "position": [
          -37.80923318,
          144.9860119
        ]
      },
      {
        "name": "Hoddle St/Victoria Pde #18",
        "locality": "PTV GTFS",
        "position": [
          -37.80972686,
          144.99064424
        ]
      },
      {
        "name": "North Richmond Railway Station/Victoria St #19",
        "locality": "PTV GTFS",
        "position": [
          -37.80970922,
          144.99278018
        ]
      },
      {
        "name": "Lennox St/Victoria St #20",
        "locality": "PTV GTFS",
        "position": [
          -37.80999428,
          144.99575984
        ]
      },
      {
        "name": "Church St/Victoria St #21",
        "locality": "PTV GTFS",
        "position": [
          -37.8104897,
          145.00051721
        ]
      },
      {
        "name": "McKay St/Victoria St #22",
        "locality": "PTV GTFS",
        "position": [
          -37.81082884,
          145.00404071
        ]
      },
      {
        "name": "Flockhart St/Victoria St #23",
        "locality": "PTV GTFS",
        "position": [
          -37.81111112,
          145.00687288
        ]
      },
      {
        "name": "Burnley St/Victoria St #24",
        "locality": "PTV GTFS",
        "position": [
          -37.81143934,
          145.01029451
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "Burnley St/Victoria St #24",
        "locality": "PTV GTFS",
        "position": [
          -37.8114909,
          145.01014545
        ]
      },
      {
        "name": "Leslie St/Victoria St #23",
        "locality": "PTV GTFS",
        "position": [
          -37.81131297,
          145.00761715
        ]
      },
      {
        "name": "McKay St/Victoria St #22",
        "locality": "PTV GTFS",
        "position": [
          -37.81097624,
          145.00422985
        ]
      },
      {
        "name": "Church St/Victoria St #21",
        "locality": "PTV GTFS",
        "position": [
          -37.81061374,
          145.00092279
        ]
      },
      {
        "name": "Lennox St/Victoria St #20",
        "locality": "PTV GTFS",
        "position": [
          -37.81013809,
          144.99626711
        ]
      },
      {
        "name": "North Richmond Railway Station/Victoria St #19",
        "locality": "PTV GTFS",
        "position": [
          -37.80976307,
          144.99276736
        ]
      },
      {
        "name": "Hoddle St/Victoria Pde #18",
        "locality": "PTV GTFS",
        "position": [
          -37.80975766,
          144.99033672
        ]
      },
      {
        "name": "Wellington St/Victoria Pde #16",
        "locality": "PTV GTFS",
        "position": [
          -37.80928509,
          144.98588554
        ]
      },
      {
        "name": "Smith St/Victoria Pde #15",
        "locality": "PTV GTFS",
        "position": [
          -37.80889629,
          144.98212502
        ]
      },
      {
        "name": "Lansdowne St/Victoria Pde #13",
        "locality": "PTV GTFS",
        "position": [
          -37.80854257,
          144.97884065
        ]
      },
      {
        "name": "St Vincents Plaza/Victoria Pde #12",
        "locality": "PTV GTFS",
        "position": [
          -37.8082739,
          144.97631501
        ]
      },
      {
        "name": "Albert St/Gisborne St #11",
        "locality": "PTV GTFS",
        "position": [
          -37.80939028,
          144.97572795
        ]
      },
      {
        "name": "Parliament Railway Station/Macarthur St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.8124486,
          144.97434947
        ]
      },
      {
        "name": "Spring St/Collins St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.81353855,
          144.97327462
        ]
      },
      {
        "name": "Exhibition St/Collins St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.81435556,
          144.97048055
        ]
      },
      {
        "name": "Melbourne Town Hall/Collins St #6",
        "locality": "PTV GTFS",
        "position": [
          -37.81568334,
          144.96595711
        ]
      },
      {
        "name": "Elizabeth St/Collins St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81639699,
          144.96344972
        ]
      },
      {
        "name": "William St/Collins St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81756122,
          144.95938493
        ]
      },
      {
        "name": "Spencer St/Collins St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81884589,
          144.95499861
        ]
      },
      {
        "name": "Batman Park/Spencer St #124",
        "locality": "PTV GTFS",
        "position": [
          -37.82199993,
          144.95551366
        ]
      },
      {
        "name": "Casino/MCEC/Clarendon St #124A",
        "locality": "PTV GTFS",
        "position": [
          -37.82345413,
          144.95622335
        ]
      },
      {
        "name": "City Rd/Clarendon St #126",
        "locality": "PTV GTFS",
        "position": [
          -37.82805991,
          144.95834586
        ]
      },
      {
        "name": "York St/Clarendon St #127",
        "locality": "PTV GTFS",
        "position": [
          -37.83060483,
          144.9595937
        ]
      },
      {
        "name": "Dorcas St/Clarendon St #128",
        "locality": "PTV GTFS",
        "position": [
          -37.83279431,
          144.96061279
        ]
      },
      {
        "name": "Park St/Clarendon St #129",
        "locality": "PTV GTFS",
        "position": [
          -37.83502942,
          144.96166478
        ]
      },
      {
        "name": "Albert Rd/Clarendon St #130",
        "locality": "PTV GTFS",
        "position": [
          -37.83894288,
          144.96336381
        ]
      },
      {
        "name": "Melbourne Sports & Aquatic Centre/Albert Rd #131",
        "locality": "PTV GTFS",
        "position": [
          -37.84057701,
          144.96145524
        ]
      },
      {
        "name": "Canterbury Rd/Albert Rd #132",
        "locality": "PTV GTFS",
        "position": [
          -37.84228278,
          144.95952188
        ]
      },
      {
        "name": "Canterbury Rd/Mills St #133",
        "locality": "PTV GTFS",
        "position": [
          -37.84450002,
          144.96006306
        ]
      },
      {
        "name": "Carter St/Mills St #134",
        "locality": "PTV GTFS",
        "position": [
          -37.84566385,
          144.95909912
        ]
      },
      {
        "name": "Richardson St/Mills St #135",
        "locality": "PTV GTFS",
        "position": [
          -37.84722748,
          144.95780591
        ]
      },
      {
        "name": "Danks St/Mills St #136",
        "locality": "PTV GTFS",
        "position": [
          -37.84932424,
          144.95607742
        ]
      },
      {
        "name": "Harold St/Danks St #137",
        "locality": "PTV GTFS",
        "position": [
          -37.85101287,
          144.95887206
        ]
      },
      {
        "name": "Armstrong St/Danks St #138",
        "locality": "PTV GTFS",
        "position": [
          -37.85270107,
          144.96216692
        ]
      },
      {
        "name": "Langridge St/Patterson St #139",
        "locality": "PTV GTFS",
        "position": [
          -37.85446751,
          144.96530066
        ]
      },
      {
        "name": "Fraser St/Patterson St #140",
        "locality": "PTV GTFS",
        "position": [
          -37.85542727,
          144.96712689
        ]
      },
      {
        "name": "Cowderoy St/Park St #141",
        "locality": "PTV GTFS",
        "position": [
          -37.85717968,
          144.97049994
        ]
      },
      {
        "name": "Mary St/Park St #142",
        "locality": "PTV GTFS",
        "position": [
          -37.85947696,
          144.97307394
        ]
      },
      {
        "name": "Fitzroy St/Park St #143",
        "locality": "PTV GTFS",
        "position": [
          -37.86098764,
          144.97445338
        ]
      }
    ]
  },
  {
    "routeLabel": "19",
    "longName": "Flinders Street Station - North Coburg",
    "color": "8A1B61",
    "forwardDestination": "North Coburg",
    "reverseDestination": "Flinders Street Station",
    "forwardStops": [
      {
        "name": "Flinders Street Railway Station/Elizabeth St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81771743,
          144.96476527
        ]
      },
      {
        "name": "Collins St/Elizabeth St #2",
        "locality": "PTV GTFS",
        "position": [
          -37.81549116,
          144.96370181
        ]
      },
      {
        "name": "Bourke Street Mall/Elizabeth St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81354706,
          144.96280104
        ]
      },
      {
        "name": "Melbourne Central Station/Elizabeth St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.8106403,
          144.96147244
        ]
      },
      {
        "name": "Queen Victoria Market/Elizabeth St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.80662499,
          144.95961788
        ]
      },
      {
        "name": "Pelham St/Elizabeth St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.80201923,
          144.95749584
        ]
      },
      {
        "name": "Royal Melbourne Hospital-Parkville Station/Royal Pde (Melbo... #10",
        "locality": "PTV GTFS",
        "position": [
          -37.79998236,
          144.95748381
        ]
      },
      {
        "name": "Morrah St/Royal Pde #12",
        "locality": "PTV GTFS",
        "position": [
          -37.79565568,
          144.95794368
        ]
      },
      {
        "name": "Gatehouse St/Royal Pde #13",
        "locality": "PTV GTFS",
        "position": [
          -37.79267912,
          144.95830955
        ]
      },
      {
        "name": "Macarthur Rd/Royal Pde #14",
        "locality": "PTV GTFS",
        "position": [
          -37.79001743,
          144.958644
        ]
      },
      {
        "name": "Leonard St/Royal Pde #15",
        "locality": "PTV GTFS",
        "position": [
          -37.78793104,
          144.95889446
        ]
      },
      {
        "name": "Visy Park/Royal Pde #16",
        "locality": "PTV GTFS",
        "position": [
          -37.78485559,
          144.95927431
        ]
      },
      {
        "name": "Ievers St/Royal Pde #17",
        "locality": "PTV GTFS",
        "position": [
          -37.78188803,
          144.9596398
        ]
      },
      {
        "name": "Brunswick Rd/Sydney Rd #19",
        "locality": "PTV GTFS",
        "position": [
          -37.77759148,
          144.96028022
        ]
      },
      {
        "name": "Barkly Square/Sydney Rd #20",
        "locality": "PTV GTFS",
        "position": [
          -37.77484186,
          144.96074181
        ]
      },
      {
        "name": "Brunswick Town Hall/Sydney Rd #21",
        "locality": "PTV GTFS",
        "position": [
          -37.77164265,
          144.96126113
        ]
      },
      {
        "name": "Albert St/Sydney Rd #22",
        "locality": "PTV GTFS",
        "position": [
          -37.76894706,
          144.96172115
        ]
      },
      {
        "name": "Victoria St/Sydney Rd #23",
        "locality": "PTV GTFS",
        "position": [
          -37.76714106,
          144.96203185
        ]
      },
      {
        "name": "Brunswick Baptist Church/Sydney Rd #24",
        "locality": "PTV GTFS",
        "position": [
          -37.76557768,
          144.9623018
        ]
      },
      {
        "name": "Stewart St/Sydney Rd #25",
        "locality": "PTV GTFS",
        "position": [
          -37.7632324,
          144.96269537
        ]
      },
      {
        "name": "Albion St/Sydney Rd #26",
        "locality": "PTV GTFS",
        "position": [
          -37.76095918,
          144.96308694
        ]
      },
      {
        "name": "Brunswick Tram Depot/Sydney Rd #27",
        "locality": "PTV GTFS",
        "position": [
          -37.75781457,
          144.96363858
        ]
      },
      {
        "name": "Moreland Rd/Sydney Rd #28",
        "locality": "PTV GTFS",
        "position": [
          -37.75564023,
          144.96401602
        ]
      },
      {
        "name": "Moore St/Sydney Rd #29",
        "locality": "PTV GTFS",
        "position": [
          -37.75350231,
          144.96441513
        ]
      },
      {
        "name": "The Avenue/Sydney Rd #30",
        "locality": "PTV GTFS",
        "position": [
          -37.75207324,
          144.9646359
        ]
      },
      {
        "name": "Reynard St/Sydney Rd #31",
        "locality": "PTV GTFS",
        "position": [
          -37.74873966,
          144.96520392
        ]
      },
      {
        "name": "Munro St/Sydney Rd #32",
        "locality": "PTV GTFS",
        "position": [
          -37.74506476,
          144.96583797
        ]
      },
      {
        "name": "Coburg Market/Sydney Rd #33",
        "locality": "PTV GTFS",
        "position": [
          -37.74325874,
          144.96614844
        ]
      },
      {
        "name": "Bell St/Sydney Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.74147092,
          144.96646974
        ]
      },
      {
        "name": "Rogers St/Sydney Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.73584038,
          144.96605644
        ]
      },
      {
        "name": "Gaffney St/Sydney Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.73409741,
          144.96532119
        ]
      },
      {
        "name": "Renown St/Sydney Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.73161894,
          144.9642657
        ]
      },
      {
        "name": "Mercy College/Sydney Rd #39",
        "locality": "PTV GTFS",
        "position": [
          -37.73043855,
          144.96375339
        ]
      },
      {
        "name": "North Coburg Terminus/Sydney Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.72773352,
          144.96366864
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "North Coburg Terminus/Sydney Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.72773352,
          144.96366864
        ]
      },
      {
        "name": "Mercy College/Sydney Rd #39",
        "locality": "PTV GTFS",
        "position": [
          -37.72989065,
          144.96385917
        ]
      },
      {
        "name": "Carr St/Sydney Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.73211182,
          144.96462665
        ]
      },
      {
        "name": "Gaffney St/Sydney Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.73385558,
          144.96540724
        ]
      },
      {
        "name": "Rogers St/Sydney Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.73553432,
          144.96607617
        ]
      },
      {
        "name": "St Pauls Catholic Church/Sydney Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.73750463,
          144.96693006
        ]
      },
      {
        "name": "Bell St/Sydney Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.74115879,
          144.96665985
        ]
      },
      {
        "name": "Coburg Market/Sydney Rd #33",
        "locality": "PTV GTFS",
        "position": [
          -37.74313615,
          144.96635607
        ]
      },
      {
        "name": "Harding St/Sydney Rd #32",
        "locality": "PTV GTFS",
        "position": [
          -37.74488833,
          144.96605843
        ]
      },
      {
        "name": "Edward St/Sydney Rd #31",
        "locality": "PTV GTFS",
        "position": [
          -37.74847354,
          144.96544955
        ]
      },
      {
        "name": "The Avenue/Sydney Rd #30",
        "locality": "PTV GTFS",
        "position": [
          -37.75186059,
          144.96484602
        ]
      },
      {
        "name": "Moore St/Sydney Rd #29",
        "locality": "PTV GTFS",
        "position": [
          -37.75350466,
          144.96455127
        ]
      },
      {
        "name": "Moreland Rd/Sydney Rd #28",
        "locality": "PTV GTFS",
        "position": [
          -37.75528248,
          144.96417338
        ]
      },
      {
        "name": "Brunswick Tram Depot/Sydney Rd #27",
        "locality": "PTV GTFS",
        "position": [
          -37.75742216,
          144.96387636
        ]
      },
      {
        "name": "Albion St/Sydney Rd #26",
        "locality": "PTV GTFS",
        "position": [
          -37.76073771,
          144.96330869
        ]
      },
      {
        "name": "Stewart St/Sydney Rd #25",
        "locality": "PTV GTFS",
        "position": [
          -37.7630828,
          144.96290381
        ]
      },
      {
        "name": "Blyth St/Sydney Rd #24",
        "locality": "PTV GTFS",
        "position": [
          -37.76535602,
          144.96251222
        ]
      },
      {
        "name": "Victoria St/Sydney Rd #23",
        "locality": "PTV GTFS",
        "position": [
          -37.76698226,
          144.96222919
        ]
      },
      {
        "name": "Albert St/Sydney Rd #22",
        "locality": "PTV GTFS",
        "position": [
          -37.76876124,
          144.96191925
        ]
      },
      {
        "name": "Glenlyon Rd/Sydney Rd #21",
        "locality": "PTV GTFS",
        "position": [
          -37.77136695,
          144.96147305
        ]
      },
      {
        "name": "Barkly Square/Sydney Rd #20",
        "locality": "PTV GTFS",
        "position": [
          -37.77465585,
          144.96092858
        ]
      },
      {
        "name": "Brunswick Rd/Sydney Rd #19",
        "locality": "PTV GTFS",
        "position": [
          -37.77755702,
          144.960372
        ]
      },
      {
        "name": "Ievers St/Royal Pde #17",
        "locality": "PTV GTFS",
        "position": [
          -37.7816842,
          144.95983843
        ]
      },
      {
        "name": "Walker St/Royal Pde #16",
        "locality": "PTV GTFS",
        "position": [
          -37.7845893,
          144.95950873
        ]
      },
      {
        "name": "Leonard St/Royal Pde #15",
        "locality": "PTV GTFS",
        "position": [
          -37.78767376,
          144.95912865
        ]
      },
      {
        "name": "Cemetery Road West/Royal Pde #14",
        "locality": "PTV GTFS",
        "position": [
          -37.78971511,
          144.95887943
        ]
      },
      {
        "name": "Gatehouse St/Royal Pde #13",
        "locality": "PTV GTFS",
        "position": [
          -37.79242184,
          144.95854375
        ]
      },
      {
        "name": "Morrah St/Royal Pde #12",
        "locality": "PTV GTFS",
        "position": [
          -37.79556053,
          144.95817343
        ]
      },
      {
        "name": "Royal Melbourne Hospital-Parkville Station/Royal Pde (Parkv... #10",
        "locality": "PTV GTFS",
        "position": [
          -37.79945329,
          144.95763467
        ]
      },
      {
        "name": "Pelham St/Elizabeth St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.80214829,
          144.95766265
        ]
      },
      {
        "name": "Queen Victoria Market/Elizabeth St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.80680848,
          144.95980592
        ]
      },
      {
        "name": "Melbourne Central Station/Elizabeth St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81101433,
          144.96173476
        ]
      },
      {
        "name": "Bourke Street Mall/Elizabeth St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81387585,
          144.96305327
        ]
      },
      {
        "name": "Collins St/Elizabeth St #2",
        "locality": "PTV GTFS",
        "position": [
          -37.81583776,
          144.9639422
        ]
      },
      {
        "name": "Flinders Street Railway Station/Elizabeth St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81789895,
          144.9648398
        ]
      }
    ]
  },
  {
    "routeLabel": "30",
    "longName": "Central Pier Docklands - St Vincents Plaza",
    "color": "534F96",
    "forwardDestination": "St Vincents Plaza",
    "reverseDestination": "Central Pier Docklands",
    "forwardStops": [
      {
        "name": "Central Pier/Harbour Esp #D2",
        "locality": "PTV GTFS",
        "position": [
          -37.81470491,
          144.94490068
        ]
      },
      {
        "name": "Docklands Stadium/La Trobe St  #D1",
        "locality": "PTV GTFS",
        "position": [
          -37.81460496,
          144.9464029
        ]
      },
      {
        "name": "Spencer St/La Trobe St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81272642,
          144.95289563
        ]
      },
      {
        "name": "Flagstaff Station/La Trobe St  #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81162994,
          144.95669713
        ]
      },
      {
        "name": "Melbourne Central Station/La Trobe St  #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81035321,
          144.96102598
        ]
      },
      {
        "name": "Melbourne Central & State Library stations/La Trobe St (Melb... #6",
        "locality": "PTV GTFS",
        "position": [
          -37.80928289,
          144.96479244
        ]
      },
      {
        "name": "Exhibition St/La Trobe St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.80845759,
          144.96762067
        ]
      },
      {
        "name": "Victoria St/La Trobe St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.80765612,
          144.97026645
        ]
      },
      {
        "name": "Nicholson St/Victoria Pde #10",
        "locality": "PTV GTFS",
        "position": [
          -37.80786246,
          144.97282782
        ]
      },
      {
        "name": "St Vincents Plaza/Victoria Pde #12",
        "locality": "PTV GTFS",
        "position": [
          -37.80821104,
          144.97632809
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "St Vincents Plaza/Victoria Pde #12",
        "locality": "PTV GTFS",
        "position": [
          -37.8082739,
          144.97631501
        ]
      },
      {
        "name": "Nicholson St/Victoria Pde #10",
        "locality": "PTV GTFS",
        "position": [
          -37.80801928,
          144.97356184
        ]
      },
      {
        "name": "La Trobe St/Victoria St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.80761421,
          144.97097182
        ]
      },
      {
        "name": "Exhibition St/La Trobe St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.80861385,
          144.96727563
        ]
      },
      {
        "name": "Melbourne Central & State Library stations/La Trobe St (Melb... #6",
        "locality": "PTV GTFS",
        "position": [
          -37.80954153,
          144.96411517
        ]
      },
      {
        "name": "Melbourne Central Station/La Trobe St  #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81054587,
          144.96070263
        ]
      },
      {
        "name": "Flagstaff Station/La Trobe St  #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81168516,
          144.95676376
        ]
      },
      {
        "name": "Spencer St/La Trobe St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81288303,
          144.95257325
        ]
      },
      {
        "name": "Docklands Stadium/La Trobe St  #D1",
        "locality": "PTV GTFS",
        "position": [
          -37.81456566,
          144.94673342
        ]
      },
      {
        "name": "Central Pier/Harbour Esp #D2",
        "locality": "PTV GTFS",
        "position": [
          -37.8142488,
          144.9445839
        ]
      }
    ]
  },
  {
    "routeLabel": "35",
    "longName": "City Circle",
    "color": "6B3529",
    "forwardDestination": "Waterfront City - Stop D11",
    "reverseDestination": "Southbank Tram Depot - Stop 125A",
    "forwardStops": [
      {
        "name": "Waterfront City/Docklands Dr #D11",
        "locality": "PTV GTFS",
        "position": [
          -37.81434514,
          144.93875383
        ]
      },
      {
        "name": "NewQuay Prom/Docklands Dr #D10",
        "locality": "PTV GTFS",
        "position": [
          -37.81331193,
          144.9415088
        ]
      },
      {
        "name": "Central Pier/Harbour Esp #D2",
        "locality": "PTV GTFS",
        "position": [
          -37.81470491,
          144.94490068
        ]
      },
      {
        "name": "Docklands Stadium/La Trobe St  #D1",
        "locality": "PTV GTFS",
        "position": [
          -37.81460496,
          144.9464029
        ]
      },
      {
        "name": "Spencer St/La Trobe St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81272642,
          144.95289563
        ]
      },
      {
        "name": "Flagstaff Station/La Trobe St  #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81162994,
          144.95669713
        ]
      },
      {
        "name": "Melbourne Central Station/La Trobe St  #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81035321,
          144.96102598
        ]
      },
      {
        "name": "Melbourne Central & State Library stations/La Trobe St (Melb... #6",
        "locality": "PTV GTFS",
        "position": [
          -37.80928289,
          144.96479244
        ]
      },
      {
        "name": "Exhibition St/La Trobe St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.80845759,
          144.96762067
        ]
      },
      {
        "name": "Victoria St/La Trobe St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.80765612,
          144.97026645
        ]
      },
      {
        "name": "Nicholson St/Victoria Pde #10",
        "locality": "PTV GTFS",
        "position": [
          -37.80786246,
          144.97282782
        ]
      },
      {
        "name": "Albert St/Nicholson St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.8096665,
          144.97292615
        ]
      },
      {
        "name": "Bourke St/Spring St #0",
        "locality": "PTV GTFS",
        "position": [
          -37.81166362,
          144.97324638
        ]
      },
      {
        "name": "Spring St/Flinders St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.81553662,
          144.97417418
        ]
      },
      {
        "name": "Russell St/Flinders St #6",
        "locality": "PTV GTFS",
        "position": [
          -37.81665933,
          144.9702925
        ]
      },
      {
        "name": "Swanston St/Flinders St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81775625,
          144.96649093
        ]
      },
      {
        "name": "Elizabeth St/Flinders St #4",
        "locality": "PTV GTFS",
        "position": [
          -37.81841196,
          144.96428043
        ]
      },
      {
        "name": "Market St/Flinders St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81930627,
          144.96127947
        ]
      },
      {
        "name": "Melbourne Aquarium/Flinders St #2",
        "locality": "PTV GTFS",
        "position": [
          -37.82030972,
          144.95782102
        ]
      },
      {
        "name": "Spencer St/Flinders St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.82105139,
          144.95538079
        ]
      },
      {
        "name": "Victoria Police Centre/Flinders St #D6",
        "locality": "PTV GTFS",
        "position": [
          -37.82172569,
          144.95321503
        ]
      },
      {
        "name": "South Wharf/Wurundjeri Way #D5",
        "locality": "PTV GTFS",
        "position": [
          -37.82200105,
          144.95091257
        ]
      },
      {
        "name": "Docklands Park/Harbour Esp #D4",
        "locality": "PTV GTFS",
        "position": [
          -37.82172534,
          144.94750066
        ]
      },
      {
        "name": "Stadium Precinct - Bourke St/Harbour Esp #D3",
        "locality": "PTV GTFS",
        "position": [
          -37.81746297,
          144.94596018
        ]
      },
      {
        "name": "Central Pier/Harbour Esp #D2",
        "locality": "PTV GTFS",
        "position": [
          -37.8142488,
          144.9445839
        ]
      },
      {
        "name": "New Quay Prom/Docklands Dr #D10",
        "locality": "PTV GTFS",
        "position": [
          -37.81378105,
          144.94050751
        ]
      },
      {
        "name": "Waterfront City/Docklands Dr #D11",
        "locality": "PTV GTFS",
        "position": [
          -37.81455555,
          144.93841856
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "Waterfront City/Docklands Dr #D11",
        "locality": "PTV GTFS",
        "position": [
          -37.81455555,
          144.93841856
        ]
      },
      {
        "name": "New Quay Prom/Docklands Dr #D10",
        "locality": "PTV GTFS",
        "position": [
          -37.81378105,
          144.94050751
        ]
      },
      {
        "name": "Central Pier/Harbour Esp #D2",
        "locality": "PTV GTFS",
        "position": [
          -37.8142488,
          144.9445839
        ]
      },
      {
        "name": "Stadium Precinct - Bourke St/Harbour Esp #D3",
        "locality": "PTV GTFS",
        "position": [
          -37.81746297,
          144.94596018
        ]
      },
      {
        "name": "Docklands Park/Harbour Esp #D4",
        "locality": "PTV GTFS",
        "position": [
          -37.82172534,
          144.94750066
        ]
      },
      {
        "name": "South Wharf/Wurundjeri Way #D5",
        "locality": "PTV GTFS",
        "position": [
          -37.82200105,
          144.95091257
        ]
      },
      {
        "name": "Victoria Police Centre/Flinders St #D6",
        "locality": "PTV GTFS",
        "position": [
          -37.82172569,
          144.95321503
        ]
      },
      {
        "name": "Spencer St/Flinders St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.82105139,
          144.95538079
        ]
      },
      {
        "name": "Melbourne Aquarium/Flinders St #2",
        "locality": "PTV GTFS",
        "position": [
          -37.82030972,
          144.95782102
        ]
      },
      {
        "name": "Market St/Flinders St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81930627,
          144.96127947
        ]
      },
      {
        "name": "Elizabeth St/Flinders St #4",
        "locality": "PTV GTFS",
        "position": [
          -37.81841196,
          144.96428043
        ]
      },
      {
        "name": "Swanston St/Flinders St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81775625,
          144.96649093
        ]
      },
      {
        "name": "Russell St/Flinders St #6",
        "locality": "PTV GTFS",
        "position": [
          -37.81665933,
          144.9702925
        ]
      },
      {
        "name": "Spring St/Flinders St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.81553662,
          144.97417418
        ]
      },
      {
        "name": "Bourke St/Spring St #0",
        "locality": "PTV GTFS",
        "position": [
          -37.81166362,
          144.97324638
        ]
      },
      {
        "name": "Albert St/Nicholson St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.8096665,
          144.97292615
        ]
      },
      {
        "name": "Nicholson St/Victoria Pde #10",
        "locality": "PTV GTFS",
        "position": [
          -37.80786246,
          144.97282782
        ]
      },
      {
        "name": "Victoria St/La Trobe St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.80765612,
          144.97026645
        ]
      },
      {
        "name": "Exhibition St/La Trobe St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.80845759,
          144.96762067
        ]
      },
      {
        "name": "Melbourne Central & State Library stations/La Trobe St (Melb... #6",
        "locality": "PTV GTFS",
        "position": [
          -37.80928289,
          144.96479244
        ]
      },
      {
        "name": "Melbourne Central Station/La Trobe St  #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81035321,
          144.96102598
        ]
      },
      {
        "name": "Flagstaff Station/La Trobe St  #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81162994,
          144.95669713
        ]
      },
      {
        "name": "Spencer St/La Trobe St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81272642,
          144.95289563
        ]
      },
      {
        "name": "Docklands Stadium/La Trobe St  #D1",
        "locality": "PTV GTFS",
        "position": [
          -37.81460496,
          144.9464029
        ]
      },
      {
        "name": "Central Pier/Harbour Esp #D2",
        "locality": "PTV GTFS",
        "position": [
          -37.81470491,
          144.94490068
        ]
      },
      {
        "name": "NewQuay Prom/Docklands Dr #D10",
        "locality": "PTV GTFS",
        "position": [
          -37.81331193,
          144.9415088
        ]
      },
      {
        "name": "Waterfront City/Docklands Dr #D11",
        "locality": "PTV GTFS",
        "position": [
          -37.81434514,
          144.93875383
        ]
      }
    ]
  },
  {
    "routeLabel": "48",
    "longName": "Victoria Harbour Docklands - North Balwyn",
    "color": "333434",
    "forwardDestination": "North Balwyn",
    "reverseDestination": "Victoria Harbour Docklands",
    "forwardStops": [
      {
        "name": "Bourke St/Collins St #D18",
        "locality": "PTV GTFS",
        "position": [
          -37.82078292,
          144.94203967
        ]
      },
      {
        "name": "Merchant St/Collins St #D17",
        "locality": "PTV GTFS",
        "position": [
          -37.8214563,
          144.94550865
        ]
      },
      {
        "name": "Harbour Esp/Collins St #D16",
        "locality": "PTV GTFS",
        "position": [
          -37.8208057,
          144.94799191
        ]
      },
      {
        "name": "Batman's Hill/Collins St #D15",
        "locality": "PTV GTFS",
        "position": [
          -37.8200918,
          144.95046552
        ]
      },
      {
        "name": "Southern Cross Station/Collins St #D14",
        "locality": "PTV GTFS",
        "position": [
          -37.81948862,
          144.95257249
        ]
      },
      {
        "name": "Spencer St/Collins St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81870592,
          144.95524103
        ]
      },
      {
        "name": "William St/Collins St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81739736,
          144.95980976
        ]
      },
      {
        "name": "Elizabeth St/Collins St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81624916,
          144.9637605
        ]
      },
      {
        "name": "Melbourne Town Hall/Collins St #6",
        "locality": "PTV GTFS",
        "position": [
          -37.81551769,
          144.96627972
        ]
      },
      {
        "name": "Exhibition St/Collins St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.81422456,
          144.97072269
        ]
      },
      {
        "name": "Spring St/Collins St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.81341597,
          144.97348244
        ]
      },
      {
        "name": "Lansdowne St/Wellington Pde #9",
        "locality": "PTV GTFS",
        "position": [
          -37.81545285,
          144.97716407
        ]
      },
      {
        "name": "Jolimont Rd/Wellington Pde #10",
        "locality": "PTV GTFS",
        "position": [
          -37.81575029,
          144.97979141
        ]
      },
      {
        "name": "Jolimont Station-MCG/Wellington Pde #11",
        "locality": "PTV GTFS",
        "position": [
          -37.81630429,
          144.98477463
        ]
      },
      {
        "name": "Simpson St/Wellington Pde #13",
        "locality": "PTV GTFS",
        "position": [
          -37.81654033,
          144.98698338
        ]
      },
      {
        "name": "Punt Rd/Wellington Pde #14",
        "locality": "PTV GTFS",
        "position": [
          -37.81738838,
          144.98967538
        ]
      },
      {
        "name": "Epworth Hospital/Bridge Rd #15",
        "locality": "PTV GTFS",
        "position": [
          -37.81790945,
          144.99380768
        ]
      },
      {
        "name": "Bosisto St/Bridge Rd #17",
        "locality": "PTV GTFS",
        "position": [
          -37.8182715,
          144.99654703
        ]
      },
      {
        "name": "Church St/Bridge Rd #18",
        "locality": "PTV GTFS",
        "position": [
          -37.81847187,
          144.99879093
        ]
      },
      {
        "name": "Richmond Town Hall/Bridge Rd #19",
        "locality": "PTV GTFS",
        "position": [
          -37.81875004,
          145.00137354
        ]
      },
      {
        "name": "Coppin St/Bridge Rd #20",
        "locality": "PTV GTFS",
        "position": [
          -37.81897658,
          145.00357133
        ]
      },
      {
        "name": "Burnley St/Bridge Rd #21",
        "locality": "PTV GTFS",
        "position": [
          -37.81953496,
          145.00887293
        ]
      },
      {
        "name": "Yarra Bvd/Bridge Rd #22",
        "locality": "PTV GTFS",
        "position": [
          -37.82009867,
          145.01396998
        ]
      },
      {
        "name": "Hawthorn Bridge/Bridge Rd #23",
        "locality": "PTV GTFS",
        "position": [
          -37.8199499,
          145.01637102
        ]
      },
      {
        "name": "Grattan St/Church St #24",
        "locality": "PTV GTFS",
        "position": [
          -37.81790581,
          145.01860689
        ]
      },
      {
        "name": "Brook St/Church St #25",
        "locality": "PTV GTFS",
        "position": [
          -37.81592073,
          145.0206025
        ]
      },
      {
        "name": "Barkers Rd/Church St #26",
        "locality": "PTV GTFS",
        "position": [
          -37.81325268,
          145.02325235
        ]
      },
      {
        "name": "Stevenson St/High St #31",
        "locality": "PTV GTFS",
        "position": [
          -37.81022844,
          145.02616139
        ]
      },
      {
        "name": "Kew Junction/High St #32",
        "locality": "PTV GTFS",
        "position": [
          -37.80759248,
          145.02858281
        ]
      },
      {
        "name": "Kew Shopping Centre/High St #33",
        "locality": "PTV GTFS",
        "position": [
          -37.80681369,
          145.03051174
        ]
      },
      {
        "name": "Pakington St/High St #34",
        "locality": "PTV GTFS",
        "position": [
          -37.80561661,
          145.03383744
        ]
      },
      {
        "name": "Cobden St/High St #35",
        "locality": "PTV GTFS",
        "position": [
          -37.80498727,
          145.0355465
        ]
      },
      {
        "name": "Parkhill Rd/High St #36",
        "locality": "PTV GTFS",
        "position": [
          -37.80348933,
          145.03975456
        ]
      },
      {
        "name": "Kew Cemetery/High St #37",
        "locality": "PTV GTFS",
        "position": [
          -37.80247266,
          145.0425641
        ]
      },
      {
        "name": "Victoria Park/High St #38",
        "locality": "PTV GTFS",
        "position": [
          -37.80125872,
          145.04598072
        ]
      },
      {
        "name": "Harp Rd/High St #39",
        "locality": "PTV GTFS",
        "position": [
          -37.79941303,
          145.05043601
        ]
      },
      {
        "name": "Harp Village/High St #40",
        "locality": "PTV GTFS",
        "position": [
          -37.79862823,
          145.05202394
        ]
      },
      {
        "name": "Clyde St/High St #41",
        "locality": "PTV GTFS",
        "position": [
          -37.7974388,
          145.05475817
        ]
      },
      {
        "name": "Irymple Ave/High St #42",
        "locality": "PTV GTFS",
        "position": [
          -37.796397,
          145.05715908
        ]
      },
      {
        "name": "Kew High School/High St #43",
        "locality": "PTV GTFS",
        "position": [
          -37.79465037,
          145.06108881
        ]
      },
      {
        "name": "Burke Rd/High St #44",
        "locality": "PTV GTFS",
        "position": [
          -37.79353016,
          145.06366194
        ]
      },
      {
        "name": "Wattle Ave/Doncaster Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.79283539,
          145.0674504
        ]
      },
      {
        "name": "North Balwyn Shopping Centre/Doncaster Rd #47",
        "locality": "PTV GTFS",
        "position": [
          -37.79271153,
          145.0714397
        ]
      },
      {
        "name": "Sunburst Ave/Doncaster Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.79321738,
          145.07426566
        ]
      },
      {
        "name": "Cityview Rd/Doncaster Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.7937563,
          145.07746556
        ]
      },
      {
        "name": "Hill Rd/Doncaster Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.7942586,
          145.08118886
        ]
      },
      {
        "name": "Balwyn Rd/Doncaster Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.79464808,
          145.08463121
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "Balwyn Rd/Doncaster Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.79464808,
          145.08463121
        ]
      },
      {
        "name": "Dight Ave/Doncaster Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.79437164,
          145.08093609
        ]
      },
      {
        "name": "Buchanan Ave/Doncaster Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.79394072,
          145.07772198
        ]
      },
      {
        "name": "Osburn Ave/Doncaster Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.79341156,
          145.07456724
        ]
      },
      {
        "name": "North Balwyn Shopping Centre/Doncaster Rd #47",
        "locality": "PTV GTFS",
        "position": [
          -37.79272684,
          145.07072386
        ]
      },
      {
        "name": "Wattle Ave/Doncaster Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.79300579,
          145.06740053
        ]
      },
      {
        "name": "Burke Rd/Doncaster Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.79346799,
          145.06426546
        ]
      },
      {
        "name": "Kew High School/High St #43",
        "locality": "PTV GTFS",
        "position": [
          -37.7946997,
          145.06134872
        ]
      },
      {
        "name": "Woodlands Ave/High St #42",
        "locality": "PTV GTFS",
        "position": [
          -37.79632435,
          145.05767205
        ]
      },
      {
        "name": "Station St/High St #41",
        "locality": "PTV GTFS",
        "position": [
          -37.79796577,
          145.05392663
        ]
      },
      {
        "name": "Harp Village/High St #40",
        "locality": "PTV GTFS",
        "position": [
          -37.79872113,
          145.05219186
        ]
      },
      {
        "name": "Harp Rd/High St #39",
        "locality": "PTV GTFS",
        "position": [
          -37.79956353,
          145.05027305
        ]
      },
      {
        "name": "Victoria Park/High St #38",
        "locality": "PTV GTFS",
        "position": [
          -37.80131597,
          145.04617229
        ]
      },
      {
        "name": "Kew Cemetery/High St #37",
        "locality": "PTV GTFS",
        "position": [
          -37.80258226,
          145.04265207
        ]
      },
      {
        "name": "Gladstone St/High St #36",
        "locality": "PTV GTFS",
        "position": [
          -37.80353871,
          145.04001449
        ]
      },
      {
        "name": "Charles St/High St #35",
        "locality": "PTV GTFS",
        "position": [
          -37.80501248,
          145.03597744
        ]
      },
      {
        "name": "Union St/High St #34",
        "locality": "PTV GTFS",
        "position": [
          -37.80564013,
          145.0341662
        ]
      },
      {
        "name": "Kew Shopping Centre/High St #33",
        "locality": "PTV GTFS",
        "position": [
          -37.80667385,
          145.03131054
        ]
      },
      {
        "name": "Kew Junction/High St #32",
        "locality": "PTV GTFS",
        "position": [
          -37.80743064,
          145.02914368
        ]
      },
      {
        "name": "Stevenson St/High St #31",
        "locality": "PTV GTFS",
        "position": [
          -37.81008101,
          145.02650609
        ]
      },
      {
        "name": "Barkers Rd/High St #29",
        "locality": "PTV GTFS",
        "position": [
          -37.812964,
          145.02377122
        ]
      },
      {
        "name": "Brook St/Church St #25",
        "locality": "PTV GTFS",
        "position": [
          -37.81575588,
          145.02098178
        ]
      },
      {
        "name": "Hill St/Church St #24",
        "locality": "PTV GTFS",
        "position": [
          -37.81797135,
          145.01875282
        ]
      },
      {
        "name": "Hawthorn Bridge/Bridge Rd #23",
        "locality": "PTV GTFS",
        "position": [
          -37.82001948,
          145.01622148
        ]
      },
      {
        "name": "Yarra Bvd/Bridge Rd #22",
        "locality": "PTV GTFS",
        "position": [
          -37.82015215,
          145.01340053
        ]
      },
      {
        "name": "Burnley St/Bridge Rd #21",
        "locality": "PTV GTFS",
        "position": [
          -37.8194803,
          145.00777244
        ]
      },
      {
        "name": "Coppin St/Bridge Rd #20",
        "locality": "PTV GTFS",
        "position": [
          -37.81908259,
          145.00397744
        ]
      },
      {
        "name": "Richmond Town Hall/Bridge Rd #19",
        "locality": "PTV GTFS",
        "position": [
          -37.8188131,
          145.00137184
        ]
      },
      {
        "name": "Church St/Bridge Rd #18",
        "locality": "PTV GTFS",
        "position": [
          -37.81861779,
          144.99942316
        ]
      },
      {
        "name": "Waltham St/Bridge Rd #17",
        "locality": "PTV GTFS",
        "position": [
          -37.81829814,
          144.99652359
        ]
      },
      {
        "name": "Epworth Hospital/Bridge Rd #15",
        "locality": "PTV GTFS",
        "position": [
          -37.81802267,
          144.99357741
        ]
      },
      {
        "name": "Punt Rd/Bridge Rd #14",
        "locality": "PTV GTFS",
        "position": [
          -37.81753279,
          144.99021674
        ]
      },
      {
        "name": "Simpson St/Wellington Pde #13",
        "locality": "PTV GTFS",
        "position": [
          -37.81660319,
          144.98697031
        ]
      },
      {
        "name": "Jolimont Station-MCG/Wellington Pde #11",
        "locality": "PTV GTFS",
        "position": [
          -37.81626114,
          144.98383293
        ]
      },
      {
        "name": "Jolimont Rd/Wellington Pde #10",
        "locality": "PTV GTFS",
        "position": [
          -37.81576932,
          144.97932514
        ]
      },
      {
        "name": "Lansdowne St/Wellington Pde #9",
        "locality": "PTV GTFS",
        "position": [
          -37.81547129,
          144.97666374
        ]
      },
      {
        "name": "Spring St/Collins St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.81353855,
          144.97327462
        ]
      },
      {
        "name": "Exhibition St/Collins St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.81435556,
          144.97048055
        ]
      },
      {
        "name": "Melbourne Town Hall/Collins St #6",
        "locality": "PTV GTFS",
        "position": [
          -37.81568334,
          144.96595711
        ]
      },
      {
        "name": "Elizabeth St/Collins St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81639699,
          144.96344972
        ]
      },
      {
        "name": "William St/Collins St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81756122,
          144.95938493
        ]
      },
      {
        "name": "Spencer St/Collins St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81884589,
          144.95499861
        ]
      },
      {
        "name": "Southern Cross Station/Collins St #D14",
        "locality": "PTV GTFS",
        "position": [
          -37.81966206,
          144.95218145
        ]
      },
      {
        "name": "Batman's Hill/Collins St #D15",
        "locality": "PTV GTFS",
        "position": [
          -37.82024859,
          144.95015445
        ]
      },
      {
        "name": "Harbour Esp/Collins St #D16",
        "locality": "PTV GTFS",
        "position": [
          -37.82081807,
          144.9481847
        ]
      },
      {
        "name": "Merchant St/Collins St #D17",
        "locality": "PTV GTFS",
        "position": [
          -37.821514,
          144.94520032
        ]
      },
      {
        "name": "Bourke St/Collins St #D18",
        "locality": "PTV GTFS",
        "position": [
          -37.82081855,
          144.94201596
        ]
      }
    ]
  },
  {
    "routeLabel": "57",
    "longName": "Flinders Street Station - West Maribyrnong",
    "color": "00C1D5",
    "forwardDestination": "West Maribyrnong",
    "reverseDestination": "Flinders Street Station",
    "forwardStops": [
      {
        "name": "Flinders Street Railway Station/Elizabeth St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81771743,
          144.96476527
        ]
      },
      {
        "name": "Collins St/Elizabeth St #2",
        "locality": "PTV GTFS",
        "position": [
          -37.81549116,
          144.96370181
        ]
      },
      {
        "name": "Bourke Street Mall/Elizabeth St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81354706,
          144.96280104
        ]
      },
      {
        "name": "Melbourne Central Station/Elizabeth St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.8106403,
          144.96147244
        ]
      },
      {
        "name": "Queen Victoria Market/Elizabeth St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.80662499,
          144.95961788
        ]
      },
      {
        "name": "Peel St/Victoria St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.80605595,
          144.95746412
        ]
      },
      {
        "name": "William St/Victoria St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.80568781,
          144.95390781
        ]
      },
      {
        "name": "Chetwynd St/Victoria St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.80551725,
          144.95239053
        ]
      },
      {
        "name": "Errol St/Victoria St #11",
        "locality": "PTV GTFS",
        "position": [
          -37.80519567,
          144.94944632
        ]
      },
      {
        "name": "North Melbourne Town Hall/Errol St #12",
        "locality": "PTV GTFS",
        "position": [
          -37.80322364,
          144.94953494
        ]
      },
      {
        "name": "Curzon St/Queensberry St #13",
        "locality": "PTV GTFS",
        "position": [
          -37.80294186,
          144.94836153
        ]
      },
      {
        "name": "Abbotsford St/Queensberry St #14",
        "locality": "PTV GTFS",
        "position": [
          -37.80266294,
          144.94580241
        ]
      },
      {
        "name": "Arden St/Abbotsford St #15",
        "locality": "PTV GTFS",
        "position": [
          -37.80067191,
          144.94583486
        ]
      },
      {
        "name": "Haines St/Abbotsford St #16",
        "locality": "PTV GTFS",
        "position": [
          -37.79796781,
          144.94631863
        ]
      },
      {
        "name": "Abbotsford St Interchange/Abbotsford St #19",
        "locality": "PTV GTFS",
        "position": [
          -37.79372898,
          144.94716282
        ]
      },
      {
        "name": "Melrose St/Flemington Rd #20",
        "locality": "PTV GTFS",
        "position": [
          -37.79036632,
          144.94347442
        ]
      },
      {
        "name": "Boundary Rd/Racecourse Rd #22",
        "locality": "PTV GTFS",
        "position": [
          -37.78922751,
          144.94019016
        ]
      },
      {
        "name": "Stubbs St/Racecourse Rd #23",
        "locality": "PTV GTFS",
        "position": [
          -37.78874852,
          144.93547957
        ]
      },
      {
        "name": "Collett St/Racecourse Rd #24",
        "locality": "PTV GTFS",
        "position": [
          -37.78850691,
          144.9335218
        ]
      },
      {
        "name": "Wellington St/Racecourse Rd #25",
        "locality": "PTV GTFS",
        "position": [
          -37.78835402,
          144.93046008
        ]
      },
      {
        "name": "Newmarket Plaza/Racecourse Rd #26",
        "locality": "PTV GTFS",
        "position": [
          -37.78807431,
          144.92838985
        ]
      },
      {
        "name": "Smithfield Rd/Racecourse Rd #28",
        "locality": "PTV GTFS",
        "position": [
          -37.78774134,
          144.92534456
        ]
      },
      {
        "name": "Flemington Racecourse/Racecourse Rd #29",
        "locality": "PTV GTFS",
        "position": [
          -37.78744612,
          144.92188946
        ]
      },
      {
        "name": "Flemington Racecourse/Epsom Rd #30",
        "locality": "PTV GTFS",
        "position": [
          -37.78612602,
          144.92010962
        ]
      },
      {
        "name": "Sandown Rd/Epsom Rd #32",
        "locality": "PTV GTFS",
        "position": [
          -37.7826679,
          144.91667531
        ]
      },
      {
        "name": "Melbourne Showgrounds/Epsom Rd #33",
        "locality": "PTV GTFS",
        "position": [
          -37.77993198,
          144.91484464
        ]
      },
      {
        "name": "Munro St/Union Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.77610272,
          144.91539503
        ]
      },
      {
        "name": "St Leonards Rd/Union Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.77370341,
          144.91578032
        ]
      },
      {
        "name": "Maribyrnong Rd/Union Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.77187014,
          144.91607021
        ]
      },
      {
        "name": "Ferguson St/Maribyrnong Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.77141495,
          144.91275662
        ]
      },
      {
        "name": "Bowen St/Maribyrnong Rd #39",
        "locality": "PTV GTFS",
        "position": [
          -37.7710271,
          144.90918005
        ]
      },
      {
        "name": "Epsom Rd/Maribyrnong Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.77063134,
          144.90567187
        ]
      },
      {
        "name": "Maribyrnong Park/Maribyrnong Rd #41",
        "locality": "PTV GTFS",
        "position": [
          -37.7702968,
          144.90257069
        ]
      },
      {
        "name": "Clyde St/Raleigh Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.76982919,
          144.89908732
        ]
      },
      {
        "name": "Van Ness Ave/Raleigh Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.76950591,
          144.89612211
        ]
      },
      {
        "name": "Warrs Rd/Raleigh Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.76905702,
          144.8921842
        ]
      },
      {
        "name": "Maribyrnong Community Centre/Raleigh Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.76873947,
          144.88954811
        ]
      },
      {
        "name": "Rosamond Rd/Raleigh Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.76900299,
          144.88715661
        ]
      },
      {
        "name": "Wests Rd/Raleigh Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.76936124,
          144.88201511
        ]
      },
      {
        "name": "Central Park Ave/Cordite Ave #49",
        "locality": "PTV GTFS",
        "position": [
          -37.768856,
          144.87797673
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "Central Park Ave/Cordite Ave #49",
        "locality": "PTV GTFS",
        "position": [
          -37.768856,
          144.87797673
        ]
      },
      {
        "name": "Wests Rd/Cordite Ave #48",
        "locality": "PTV GTFS",
        "position": [
          -37.76931454,
          144.88242513
        ]
      },
      {
        "name": "Rosamond Rd/Raleigh Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.76888717,
          144.88672852
        ]
      },
      {
        "name": "Randall St/Raleigh Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.76862941,
          144.88893821
        ]
      },
      {
        "name": "Barb St/Raleigh Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.76889124,
          144.89198456
        ]
      },
      {
        "name": "Van Ness Ave/Raleigh Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.76931766,
          144.89567335
        ]
      },
      {
        "name": "Clyde St/Raleigh Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.76969864,
          144.89884126
        ]
      },
      {
        "name": "Maribyrnong Park/Maribyrnong Rd #41",
        "locality": "PTV GTFS",
        "position": [
          -37.77008033,
          144.90205459
        ]
      },
      {
        "name": "Epsom Rd/Maribyrnong Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.7704323,
          144.90512121
        ]
      },
      {
        "name": "Bowen St/Maribyrnong Rd #39",
        "locality": "PTV GTFS",
        "position": [
          -37.77086174,
          144.90900307
        ]
      },
      {
        "name": "Hotham St/Maribyrnong Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.77123617,
          144.91233024
        ]
      },
      {
        "name": "Union Rd/Maribyrnong Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.7717056,
          144.9159386
        ]
      },
      {
        "name": "St Leonards Rd/Union Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.77357111,
          144.91594298
        ]
      },
      {
        "name": "Bloomfield Rd/Union Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.77588936,
          144.91555997
        ]
      },
      {
        "name": "Melbourne Showgrounds/Union Rd #33",
        "locality": "PTV GTFS",
        "position": [
          -37.78017538,
          144.91484915
        ]
      },
      {
        "name": "Sandown Rd/Epsom Rd #32",
        "locality": "PTV GTFS",
        "position": [
          -37.78267031,
          144.9168115
        ]
      },
      {
        "name": "Flemington Racecourse/Epsom Rd #30",
        "locality": "PTV GTFS",
        "position": [
          -37.78595848,
          144.91980774
        ]
      },
      {
        "name": "Flemington Racecourse/Racecourse Rd #29",
        "locality": "PTV GTFS",
        "position": [
          -37.78734904,
          144.92200573
        ]
      },
      {
        "name": "Smithfield Rd/Racecourse Rd #28",
        "locality": "PTV GTFS",
        "position": [
          -37.78762625,
          144.92495035
        ]
      },
      {
        "name": "Newmarket Plaza/Racecourse Rd #26",
        "locality": "PTV GTFS",
        "position": [
          -37.78797103,
          144.92815427
        ]
      },
      {
        "name": "Wellington St/Racecourse Rd #25",
        "locality": "PTV GTFS",
        "position": [
          -37.78824148,
          144.93123539
        ]
      },
      {
        "name": "Victoria St/Racecourse Rd #24",
        "locality": "PTV GTFS",
        "position": [
          -37.78844326,
          144.9334895
        ]
      },
      {
        "name": "Stubbs St/Racecourse Rd #23",
        "locality": "PTV GTFS",
        "position": [
          -37.78876781,
          144.93658052
        ]
      },
      {
        "name": "Boundary Rd/Racecourse Rd #22",
        "locality": "PTV GTFS",
        "position": [
          -37.78913148,
          144.93985216
        ]
      },
      {
        "name": "Melrose St/Flemington Rd #20",
        "locality": "PTV GTFS",
        "position": [
          -37.79050222,
          144.94351607
        ]
      },
      {
        "name": "Abbotsford St Interchange/Abbotsford St #19",
        "locality": "PTV GTFS",
        "position": [
          -37.7939988,
          144.94713264
        ]
      },
      {
        "name": "Haines St/Abbotsford St #16",
        "locality": "PTV GTFS",
        "position": [
          -37.79828366,
          144.94634395
        ]
      },
      {
        "name": "Arden St/Abbotsford St #15",
        "locality": "PTV GTFS",
        "position": [
          -37.80099657,
          144.94584858
        ]
      },
      {
        "name": "Queensberry St/Abbotsford St #14",
        "locality": "PTV GTFS",
        "position": [
          -37.80238955,
          144.94562827
        ]
      },
      {
        "name": "Curzon St/Queensberry St #13",
        "locality": "PTV GTFS",
        "position": [
          -37.80282645,
          144.94794449
        ]
      },
      {
        "name": "North Melbourne Town Hall/Queensberry St #12",
        "locality": "PTV GTFS",
        "position": [
          -37.80298707,
          144.94940519
        ]
      },
      {
        "name": "Victoria St/Errol St #11",
        "locality": "PTV GTFS",
        "position": [
          -37.8049595,
          144.94933927
        ]
      },
      {
        "name": "Chetwynd St/Victoria St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.80540285,
          144.95203023
        ]
      },
      {
        "name": "Howard St/Victoria St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.80556361,
          144.95350235
        ]
      },
      {
        "name": "Peel St/Victoria St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.80607382,
          144.95797475
        ]
      },
      {
        "name": "Queen Victoria Market/Elizabeth St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.80680848,
          144.95980592
        ]
      },
      {
        "name": "Melbourne Central Station/Elizabeth St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81101433,
          144.96173476
        ]
      },
      {
        "name": "Bourke Street Mall/Elizabeth St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81387585,
          144.96305327
        ]
      },
      {
        "name": "Collins St/Elizabeth St #2",
        "locality": "PTV GTFS",
        "position": [
          -37.81583776,
          144.9639422
        ]
      },
      {
        "name": "Flinders Street Railway Station/Elizabeth St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81789895,
          144.9648398
        ]
      }
    ]
  },
  {
    "routeLabel": "58",
    "longName": "Toorak - West Coburg",
    "color": "969696",
    "forwardDestination": "West Coburg",
    "reverseDestination": "Toorak",
    "forwardStops": [
      {
        "name": "Glenbervie Rd/Toorak Rd #139",
        "locality": "PTV GTFS",
        "position": [
          -37.84361542,
          145.02981717
        ]
      },
      {
        "name": "Moonga Rd/Toorak Rd #138",
        "locality": "PTV GTFS",
        "position": [
          -37.8432312,
          145.02624773
        ]
      },
      {
        "name": "Kooyong Rd/Toorak Rd #137",
        "locality": "PTV GTFS",
        "position": [
          -37.84284435,
          145.02306477
        ]
      },
      {
        "name": "Irving Rd/Toorak Rd #136",
        "locality": "PTV GTFS",
        "position": [
          -37.84246086,
          145.0200863
        ]
      },
      {
        "name": "Woorigoleen Rd/Toorak Rd #135",
        "locality": "PTV GTFS",
        "position": [
          -37.8421664,
          145.01758276
        ]
      },
      {
        "name": "Orrong Rd/Toorak Rd #134",
        "locality": "PTV GTFS",
        "position": [
          -37.84175536,
          145.01404827
        ]
      },
      {
        "name": "Canterbury Rd/Toorak Rd #133",
        "locality": "PTV GTFS",
        "position": [
          -37.84138659,
          145.01088768
        ]
      },
      {
        "name": "Toorak Village/Toorak Rd #132",
        "locality": "PTV GTFS",
        "position": [
          -37.84109309,
          145.00845238
        ]
      },
      {
        "name": "Williams Rd/Toorak Rd #131",
        "locality": "PTV GTFS",
        "position": [
          -37.84072532,
          145.00536
        ]
      },
      {
        "name": "Hawksburn Rd/Toorak Rd #130",
        "locality": "PTV GTFS",
        "position": [
          -37.84036764,
          145.00233557
        ]
      },
      {
        "name": "Tivoli Rd/Toorak Rd #129",
        "locality": "PTV GTFS",
        "position": [
          -37.83992681,
          144.9986657
        ]
      },
      {
        "name": "Chapel St/Toorak Rd #128",
        "locality": "PTV GTFS",
        "position": [
          -37.8395889,
          144.99575443
        ]
      },
      {
        "name": "South Yarra Railway Station/Toorak Rd #127",
        "locality": "PTV GTFS",
        "position": [
          -37.83913121,
          144.99216464
        ]
      },
      {
        "name": "Punt Rd/Toorak Rd #125",
        "locality": "PTV GTFS",
        "position": [
          -37.83841678,
          144.98674102
        ]
      },
      {
        "name": "Walsh St/Toorak Rd #124",
        "locality": "PTV GTFS",
        "position": [
          -37.8381903,
          144.98456545
        ]
      },
      {
        "name": "Fawkner Park/Toorak Rd #123",
        "locality": "PTV GTFS",
        "position": [
          -37.83761951,
          144.98070617
        ]
      },
      {
        "name": "Toorak Rd/St Kilda Rd #22",
        "locality": "PTV GTFS",
        "position": [
          -37.83547648,
          144.97503778
        ]
      },
      {
        "name": "Anzac Station/St Kilda Rd #20",
        "locality": "PTV GTFS",
        "position": [
          -37.83321372,
          144.97237268
        ]
      },
      {
        "name": "Wells St/Park St #119",
        "locality": "PTV GTFS",
        "position": [
          -37.83289006,
          144.96980229
        ]
      },
      {
        "name": "Sturt St/Kings Way #118",
        "locality": "PTV GTFS",
        "position": [
          -37.83107437,
          144.96537541
        ]
      },
      {
        "name": "City Rd/Kings Way #116",
        "locality": "PTV GTFS",
        "position": [
          -37.82626018,
          144.96057684
        ]
      },
      {
        "name": "Casino/Southbank/Queens Bridge St #115",
        "locality": "PTV GTFS",
        "position": [
          -37.82171146,
          144.96122465
        ]
      },
      {
        "name": "Flinders St/Queens Bridge St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81942943,
          144.96110568
        ]
      },
      {
        "name": "Collins St/William St #4",
        "locality": "PTV GTFS",
        "position": [
          -37.81781889,
          144.95917335
        ]
      },
      {
        "name": "Bourke St/William St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81587437,
          144.95824997
        ]
      },
      {
        "name": "Flagstaff Railway Station/William St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.81199629,
          144.95651664
        ]
      },
      {
        "name": "Queen Victoria Market/Peel St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.80721578,
          144.95575112
        ]
      },
      {
        "name": "Victoria St/Peel St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.80539121,
          144.9560286
        ]
      },
      {
        "name": "Queensberry St/Peel St #11",
        "locality": "PTV GTFS",
        "position": [
          -37.8033068,
          144.95639273
        ]
      },
      {
        "name": "Flemington Rd/Peel St #12",
        "locality": "PTV GTFS",
        "position": [
          -37.80145599,
          144.95671633
        ]
      },
      {
        "name": "Royal Melbourne Hospital/Flemington Rd #14",
        "locality": "PTV GTFS",
        "position": [
          -37.79982567,
          144.95520532
        ]
      },
      {
        "name": "Murphy St/Flemington Rd #15",
        "locality": "PTV GTFS",
        "position": [
          -37.79758696,
          144.95239376
        ]
      },
      {
        "name": "Royal Childrens Hospital/Flemington Rd #19",
        "locality": "PTV GTFS",
        "position": [
          -37.79414113,
          144.94805992
        ]
      },
      {
        "name": "Elliott Ave/Royal Park #24",
        "locality": "PTV GTFS",
        "position": [
          -37.78787806,
          144.94961855
        ]
      },
      {
        "name": "State Netball Hockey Centre/Royal Park #25",
        "locality": "PTV GTFS",
        "position": [
          -37.784383,
          144.9486705
        ]
      },
      {
        "name": "Melbourne Zoo/Royal Park #26",
        "locality": "PTV GTFS",
        "position": [
          -37.78237502,
          144.94928239
        ]
      },
      {
        "name": "Royal Park Station/Royal Park #27",
        "locality": "PTV GTFS",
        "position": [
          -37.7808716,
          144.95092491
        ]
      },
      {
        "name": "Park St/Royal Park #28",
        "locality": "PTV GTFS",
        "position": [
          -37.77691749,
          144.94948999
        ]
      },
      {
        "name": "Heller St/Grantham St #29",
        "locality": "PTV GTFS",
        "position": [
          -37.77493281,
          144.94885227
        ]
      },
      {
        "name": "Union Square Shopping Centre/Grantham St #30",
        "locality": "PTV GTFS",
        "position": [
          -37.77244466,
          144.9493184
        ]
      },
      {
        "name": "Dawson St/Grantham St #31",
        "locality": "PTV GTFS",
        "position": [
          -37.77029819,
          144.94974099
        ]
      },
      {
        "name": "Daly St/Dawson St #33",
        "locality": "PTV GTFS",
        "position": [
          -37.76959274,
          144.94442475
        ]
      },
      {
        "name": "Smith St/Melville Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.76761396,
          144.94309457
        ]
      },
      {
        "name": "Victoria St/Melville Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.76491164,
          144.94368028
        ]
      },
      {
        "name": "Hope St/Melville Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.76216229,
          144.94415373
        ]
      },
      {
        "name": "Albion St/Melville Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.75873956,
          144.94477064
        ]
      },
      {
        "name": "Jacobs Reserve/Melville Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.7570509,
          144.94508979
        ]
      },
      {
        "name": "Moreland Rd/Melville Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.75342901,
          144.94565536
        ]
      },
      {
        "name": "Woodlands Ave/Melville Rd #41",
        "locality": "PTV GTFS",
        "position": [
          -37.74978147,
          144.94630103
        ]
      },
      {
        "name": "Reynard St/Melville Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.74730057,
          144.94459914
        ]
      },
      {
        "name": "Princes Tce/Melville Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.74412232,
          144.94476652
        ]
      },
      {
        "name": "Brearley Pde/Melville Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.74196587,
          144.94513257
        ]
      },
      {
        "name": "Bell St/Melville Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.74011744,
          144.94559222
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "Bell St/Melville Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.74011744,
          144.94559222
        ]
      },
      {
        "name": "Brearley Pde/Melville Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.7415921,
          144.94540392
        ]
      },
      {
        "name": "Princes Tce/Melville Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.74392811,
          144.94499886
        ]
      },
      {
        "name": "Reynard St/Melville Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.74639864,
          144.944556
        ]
      },
      {
        "name": "Woodlands Ave/Melville Rd #41",
        "locality": "PTV GTFS",
        "position": [
          -37.74887933,
          144.94624652
        ]
      },
      {
        "name": "Moreland Rd/Melville Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.75316294,
          144.94590108
        ]
      },
      {
        "name": "Jacobs Reserve/Melville Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.75662349,
          144.94538538
        ]
      },
      {
        "name": "Albion St/Melville Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.75856317,
          144.94499119
        ]
      },
      {
        "name": "Hope St/Melville Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.76204015,
          144.94438414
        ]
      },
      {
        "name": "Victoria St/Melville Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.76470803,
          144.94389025
        ]
      },
      {
        "name": "Smith St/Melville Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.76731147,
          144.94331864
        ]
      },
      {
        "name": "South Daly St/Dawson St #33",
        "locality": "PTV GTFS",
        "position": [
          -37.76952791,
          144.94535746
        ]
      },
      {
        "name": "Grantham St/Dawson St #31",
        "locality": "PTV GTFS",
        "position": [
          -37.77005124,
          144.94953211
        ]
      },
      {
        "name": "Union Square Shopping Centre/Grantham St #30",
        "locality": "PTV GTFS",
        "position": [
          -37.77225925,
          144.94953923
        ]
      },
      {
        "name": "Brunswick Rd/Grantham St #29",
        "locality": "PTV GTFS",
        "position": [
          -37.77553769,
          144.94891503
        ]
      },
      {
        "name": "Park St/Royal Park #28",
        "locality": "PTV GTFS",
        "position": [
          -37.77706714,
          144.94980376
        ]
      },
      {
        "name": "Royal Park Station/Royal Park #27",
        "locality": "PTV GTFS",
        "position": [
          -37.780753,
          144.95135965
        ]
      },
      {
        "name": "Melbourne Zoo/Royal Park #26",
        "locality": "PTV GTFS",
        "position": [
          -37.78261723,
          144.94921893
        ]
      },
      {
        "name": "State Netball Hockey Centre/Royal Park #25",
        "locality": "PTV GTFS",
        "position": [
          -37.78453929,
          144.94884786
        ]
      },
      {
        "name": "Elliott Ave/Royal Park #24",
        "locality": "PTV GTFS",
        "position": [
          -37.78801554,
          144.94975101
        ]
      },
      {
        "name": "Royal Childrens Hospital/Flemington Rd #19",
        "locality": "PTV GTFS",
        "position": [
          -37.79428158,
          144.94836266
        ]
      },
      {
        "name": "Murphy St/Flemington Rd #15",
        "locality": "PTV GTFS",
        "position": [
          -37.79748768,
          144.95238514
        ]
      },
      {
        "name": "Royal Melbourne Hospital/Flemington Rd #14",
        "locality": "PTV GTFS",
        "position": [
          -37.79947767,
          144.95488555
        ]
      },
      {
        "name": "Flemington Rd/Peel St #12",
        "locality": "PTV GTFS",
        "position": [
          -37.80177224,
          144.9567644
        ]
      },
      {
        "name": "Queensberry St/Peel St #11",
        "locality": "PTV GTFS",
        "position": [
          -37.80362305,
          144.9564408
        ]
      },
      {
        "name": "Victoria St/Peel St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.80569845,
          144.95607692
        ]
      },
      {
        "name": "Queen Victoria Market/Peel St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.80744156,
          144.95577897
        ]
      },
      {
        "name": "Flagstaff Railway Station/William St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.81246079,
          144.95679917
        ]
      },
      {
        "name": "Bourke St/William St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81544024,
          144.9581597
        ]
      },
      {
        "name": "Collins St/William St #4",
        "locality": "PTV GTFS",
        "position": [
          -37.81745702,
          144.95909244
        ]
      },
      {
        "name": "Flinders St/Queens Bridge St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81951285,
          144.96123971
        ]
      },
      {
        "name": "Casino/Southbank/Queens Bridge St #115",
        "locality": "PTV GTFS",
        "position": [
          -37.82211699,
          144.96122485
        ]
      },
      {
        "name": "City Rd/Kings Way #116",
        "locality": "PTV GTFS",
        "position": [
          -37.82630014,
          144.96080296
        ]
      },
      {
        "name": "York St/Kings Way #117",
        "locality": "PTV GTFS",
        "position": [
          -37.82976589,
          144.96422972
        ]
      },
      {
        "name": "Wells St/Park St #119",
        "locality": "PTV GTFS",
        "position": [
          -37.83280018,
          144.96981611
        ]
      },
      {
        "name": "Anzac Station/St Kilda Rd #20",
        "locality": "PTV GTFS",
        "position": [
          -37.83366407,
          144.9734057
        ]
      },
      {
        "name": "Toorak Rd/St Kilda Rd #22",
        "locality": "PTV GTFS",
        "position": [
          -37.83575237,
          144.97535976
        ]
      },
      {
        "name": "Fawkner Park/Toorak Rd #123",
        "locality": "PTV GTFS",
        "position": [
          -37.83763436,
          144.98104666
        ]
      },
      {
        "name": "Walsh St/Toorak Rd #124",
        "locality": "PTV GTFS",
        "position": [
          -37.83802758,
          144.98453579
        ]
      },
      {
        "name": "Punt Rd/Toorak Rd #125",
        "locality": "PTV GTFS",
        "position": [
          -37.83821045,
          144.98626938
        ]
      },
      {
        "name": "South Yarra Railway Station/Toorak Rd #127",
        "locality": "PTV GTFS",
        "position": [
          -37.83898574,
          144.99208904
        ]
      },
      {
        "name": "Chapel St/Toorak Rd #128",
        "locality": "PTV GTFS",
        "position": [
          -37.83937612,
          144.99543065
        ]
      },
      {
        "name": "Tivoli Rd/Toorak Rd #129",
        "locality": "PTV GTFS",
        "position": [
          -37.83977059,
          144.9984881
        ]
      },
      {
        "name": "Hawksburn Rd/Toorak Rd #130",
        "locality": "PTV GTFS",
        "position": [
          -37.84019798,
          145.00189697
        ]
      },
      {
        "name": "Williams Rd/Toorak Rd #131",
        "locality": "PTV GTFS",
        "position": [
          -37.84051387,
          145.00458161
        ]
      },
      {
        "name": "Toorak Village/Toorak Rd #132",
        "locality": "PTV GTFS",
        "position": [
          -37.84096506,
          145.00834218
        ]
      },
      {
        "name": "Grange Rd/Toorak Rd #133",
        "locality": "PTV GTFS",
        "position": [
          -37.84122828,
          145.01058511
        ]
      },
      {
        "name": "Orrong Rd/Toorak Rd #134",
        "locality": "PTV GTFS",
        "position": [
          -37.84161488,
          145.01373385
        ]
      },
      {
        "name": "Woorigoleen Rd/Toorak Rd #135",
        "locality": "PTV GTFS",
        "position": [
          -37.84202994,
          145.01750687
        ]
      },
      {
        "name": "Irving Rd/Toorak Rd #136",
        "locality": "PTV GTFS",
        "position": [
          -37.84231444,
          145.01995385
        ]
      },
      {
        "name": "Kooyong Rd/Toorak Rd #137",
        "locality": "PTV GTFS",
        "position": [
          -37.84268703,
          145.02281896
        ]
      },
      {
        "name": "Moonga Rd/Toorak Rd #138",
        "locality": "PTV GTFS",
        "position": [
          -37.84316656,
          145.02669265
        ]
      },
      {
        "name": "Glenferrie Rd/Toorak Rd #139",
        "locality": "PTV GTFS",
        "position": [
          -37.84361827,
          145.02998756
        ]
      }
    ]
  },
  {
    "routeLabel": "59",
    "longName": "Flinders Street Station - Airport West",
    "color": "00653A",
    "forwardDestination": "Airport West",
    "reverseDestination": "Flinders Street Station",
    "forwardStops": [
      {
        "name": "Flinders Street Railway Station/Elizabeth St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81771743,
          144.96476527
        ]
      },
      {
        "name": "Collins St/Elizabeth St #2",
        "locality": "PTV GTFS",
        "position": [
          -37.81549116,
          144.96370181
        ]
      },
      {
        "name": "Bourke Street Mall/Elizabeth St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81354706,
          144.96280104
        ]
      },
      {
        "name": "Melbourne Central Station/Elizabeth St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.8106403,
          144.96147244
        ]
      },
      {
        "name": "Queen Victoria Market/Elizabeth St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.80662499,
          144.95961788
        ]
      },
      {
        "name": "Pelham St/Elizabeth St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.80201923,
          144.95749584
        ]
      },
      {
        "name": "Royal Melbourne Hospital/Flemington Rd #14",
        "locality": "PTV GTFS",
        "position": [
          -37.79982567,
          144.95520532
        ]
      },
      {
        "name": "Murphy St/Flemington Rd #15",
        "locality": "PTV GTFS",
        "position": [
          -37.79758696,
          144.95239376
        ]
      },
      {
        "name": "Royal Childrens Hospital/Flemington Rd #19",
        "locality": "PTV GTFS",
        "position": [
          -37.79414113,
          144.94805992
        ]
      },
      {
        "name": "Melrose St/Flemington Rd #20",
        "locality": "PTV GTFS",
        "position": [
          -37.79036632,
          144.94347442
        ]
      },
      {
        "name": "Flemington Bridge Station/Flemington Rd #22",
        "locality": "PTV GTFS",
        "position": [
          -37.78805429,
          144.94060882
        ]
      },
      {
        "name": "Djerring Flemington Hub/Mt Alexander Rd  #23",
        "locality": "PTV GTFS",
        "position": [
          -37.78584274,
          144.93885341
        ]
      },
      {
        "name": "Mooltan St/Mt Alexander Rd #24",
        "locality": "PTV GTFS",
        "position": [
          -37.78421823,
          144.93717261
        ]
      },
      {
        "name": "Mount Alexander College/Mt Alexander Rd #25",
        "locality": "PTV GTFS",
        "position": [
          -37.78256524,
          144.93386898
        ]
      },
      {
        "name": "Wellington St/Mt Alexander Rd #26",
        "locality": "PTV GTFS",
        "position": [
          -37.78143563,
          144.93266281
        ]
      },
      {
        "name": "Essendon Tram Depot/Mt Alexander Rd #27",
        "locality": "PTV GTFS",
        "position": [
          -37.77980781,
          144.9313116
        ]
      },
      {
        "name": "Middle St/Mt Alexander Rd #28",
        "locality": "PTV GTFS",
        "position": [
          -37.777699,
          144.92976951
        ]
      },
      {
        "name": "Warrick St/Mt Alexander Rd #29",
        "locality": "PTV GTFS",
        "position": [
          -37.77574769,
          144.92847288
        ]
      },
      {
        "name": "Maribyrnong Rd/Mt Alexander Rd #30",
        "locality": "PTV GTFS",
        "position": [
          -37.77300833,
          144.92694856
        ]
      },
      {
        "name": "Montgomery St/Mt Alexander Rd #31",
        "locality": "PTV GTFS",
        "position": [
          -37.77068587,
          144.92607115
        ]
      },
      {
        "name": "Moonee Ponds Junction/Pascoe Vale Rd #32",
        "locality": "PTV GTFS",
        "position": [
          -37.76665343,
          144.92481021
        ]
      },
      {
        "name": "Moonee Valley Civic Centre/Pascoe Vale Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.76400466,
          144.92536102
        ]
      },
      {
        "name": "Queens Park/Pascoe Vale Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.76270199,
          144.9255904
        ]
      },
      {
        "name": "Murray St/Pascoe Vale Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.75986286,
          144.92607836
        ]
      },
      {
        "name": "Buckley St/Pascoe Vale Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.75825454,
          144.9263503
        ]
      },
      {
        "name": "Fletcher St/Pascoe Vale Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.75611321,
          144.92603553
        ]
      },
      {
        "name": "Hoddle St/Fletcher St #39",
        "locality": "PTV GTFS",
        "position": [
          -37.75569314,
          144.92316425
        ]
      },
      {
        "name": "Nicholson St/Fletcher St #40",
        "locality": "PTV GTFS",
        "position": [
          -37.75545596,
          144.92095755
        ]
      },
      {
        "name": "Fletcher St/Napier St #41",
        "locality": "PTV GTFS",
        "position": [
          -37.75492907,
          144.91765802
        ]
      },
      {
        "name": "Shamrock St/Mt Alexander Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.75249642,
          144.91564919
        ]
      },
      {
        "name": "Thistle St/Mt Alexander Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.75066226,
          144.9143614
        ]
      },
      {
        "name": "Thorn St/Mt Alexander Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.74835469,
          144.91280325
        ]
      },
      {
        "name": "Leake St/Mt Alexander Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.74638439,
          144.91146268
        ]
      },
      {
        "name": "Lincoln Rd/Mt Alexander Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.74476958,
          144.91035051
        ]
      },
      {
        "name": "Mt Alexander Rd/Keilor Rd #47",
        "locality": "PTV GTFS",
        "position": [
          -37.74416157,
          144.90909656
        ]
      },
      {
        "name": "Service St/Keilor Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.74282149,
          144.9056957
        ]
      },
      {
        "name": "Essendon North Primary School/Keilor Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.74168259,
          144.90297018
        ]
      },
      {
        "name": "Cooper St/Keilor Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.7402044,
          144.89941458
        ]
      },
      {
        "name": "Bradshaw St/Keilor Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.73877237,
          144.8959259
        ]
      },
      {
        "name": "Hoffmans Rd/Keilor Rd #52",
        "locality": "PTV GTFS",
        "position": [
          -37.73747737,
          144.89254694
        ]
      },
      {
        "name": "Matthews Ave/Keilor Rd #53A",
        "locality": "PTV GTFS",
        "position": [
          -37.73655163,
          144.89016754
        ]
      },
      {
        "name": "Keilor Rd/Matthews Ave #53",
        "locality": "PTV GTFS",
        "position": [
          -37.73495933,
          144.88931631
        ]
      },
      {
        "name": "Fullarton Rd/Matthews Ave #54",
        "locality": "PTV GTFS",
        "position": [
          -37.73237075,
          144.88969619
        ]
      },
      {
        "name": "Cameron St/Matthews Ave #55",
        "locality": "PTV GTFS",
        "position": [
          -37.72988469,
          144.89026602
        ]
      },
      {
        "name": "Earl St/Matthews Ave #56",
        "locality": "PTV GTFS",
        "position": [
          -37.72720522,
          144.89060302
        ]
      },
      {
        "name": "Hawker St/Matthews Ave #57",
        "locality": "PTV GTFS",
        "position": [
          -37.72311709,
          144.89128628
        ]
      },
      {
        "name": "Marshall Rd/Matthews Ave #58",
        "locality": "PTV GTFS",
        "position": [
          -37.71841626,
          144.89197548
        ]
      },
      {
        "name": "Airport West/Matthews Ave #59",
        "locality": "PTV GTFS",
        "position": [
          -37.71384002,
          144.89056242
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "Airport West/Matthews Ave #59",
        "locality": "PTV GTFS",
        "position": [
          -37.71384002,
          144.89056242
        ]
      },
      {
        "name": "Marshall Rd/Matthews Ave #58",
        "locality": "PTV GTFS",
        "position": [
          -37.71837305,
          144.89207881
        ]
      },
      {
        "name": "Hawker St/Matthews Ave #57",
        "locality": "PTV GTFS",
        "position": [
          -37.72306487,
          144.89138987
        ]
      },
      {
        "name": "Earl St/Matthews Ave #56",
        "locality": "PTV GTFS",
        "position": [
          -37.72732353,
          144.89066774
        ]
      },
      {
        "name": "Cameron St/Matthews Ave #55",
        "locality": "PTV GTFS",
        "position": [
          -37.72991151,
          144.89025391
        ]
      },
      {
        "name": "Fullarton Rd/Matthews Ave #54",
        "locality": "PTV GTFS",
        "position": [
          -37.73235517,
          144.88983279
        ]
      },
      {
        "name": "Keilor Rd/Matthews Ave #53",
        "locality": "PTV GTFS",
        "position": [
          -37.73525758,
          144.88936458
        ]
      },
      {
        "name": "Treadwell Rd/Keilor Rd #52",
        "locality": "PTV GTFS",
        "position": [
          -37.73723052,
          144.89234968
        ]
      },
      {
        "name": "Bradshaw St/Keilor Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.73859941,
          144.89582866
        ]
      },
      {
        "name": "Cooper St/Keilor Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.74003205,
          144.89935136
        ]
      },
      {
        "name": "Essendon North PS/Keilor Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.74150083,
          144.90288452
        ]
      },
      {
        "name": "Service St/Keilor Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.74268759,
          144.90576757
        ]
      },
      {
        "name": "Mt Alexander Rd/Keilor Rd #47",
        "locality": "PTV GTFS",
        "position": [
          -37.74395158,
          144.90894359
        ]
      },
      {
        "name": "Glass St/Mt Alexander Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.74648648,
          144.91163004
        ]
      },
      {
        "name": "Thorn St/Mt Alexander Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.74810148,
          144.91275361
        ]
      },
      {
        "name": "Brewster St/Mt Alexander Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.7502273,
          144.91422607
        ]
      },
      {
        "name": "Grice Cres/Mt Alexander Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.75266296,
          144.91589421
        ]
      },
      {
        "name": "Fletcher St/Napier St #41",
        "locality": "PTV GTFS",
        "position": [
          -37.75487001,
          144.91737592
        ]
      },
      {
        "name": "Nicholson St/Fletcher St #40",
        "locality": "PTV GTFS",
        "position": [
          -37.75517232,
          144.92020502
        ]
      },
      {
        "name": "Hoddle St/Fletcher St #39",
        "locality": "PTV GTFS",
        "position": [
          -37.75546977,
          144.92276188
        ]
      },
      {
        "name": "Pascoe Vale Rd/Fletcher St #38",
        "locality": "PTV GTFS",
        "position": [
          -37.75581197,
          144.92581693
        ]
      },
      {
        "name": "Buckley St/Pascoe Vale Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.75793207,
          144.92646146
        ]
      },
      {
        "name": "Salisbury St/Pascoe Vale Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.75974036,
          144.9262861
        ]
      },
      {
        "name": "Queens Park/Pascoe Vale Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.76252564,
          144.925811
        ]
      },
      {
        "name": "Moonee Valley Civic Centre/Pascoe Vale Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.76431271,
          144.92545458
        ]
      },
      {
        "name": "Moonee Ponds Junction/Pascoe Vale Rd #32",
        "locality": "PTV GTFS",
        "position": [
          -37.76693466,
          144.92491587
        ]
      },
      {
        "name": "Montgomery St/Mt Alexander Rd #31",
        "locality": "PTV GTFS",
        "position": [
          -37.7705986,
          144.92623253
        ]
      },
      {
        "name": "Ormond Rd/Mt Alexander Rd #30",
        "locality": "PTV GTFS",
        "position": [
          -37.77243086,
          144.92690792
        ]
      },
      {
        "name": "Warrick St/Mt Alexander Rd #29",
        "locality": "PTV GTFS",
        "position": [
          -37.77554152,
          144.9285354
        ]
      },
      {
        "name": "Middle St/Mt Alexander Rd #28",
        "locality": "PTV GTFS",
        "position": [
          -37.7774568,
          144.92983303
        ]
      },
      {
        "name": "Essendon Tram Depot/Mt Alexander Rd #27",
        "locality": "PTV GTFS",
        "position": [
          -37.77943672,
          144.93121976
        ]
      },
      {
        "name": "Wellington St/Mt Alexander Rd #26",
        "locality": "PTV GTFS",
        "position": [
          -37.78111958,
          144.9326262
        ]
      },
      {
        "name": "Mount Alexander College/Mt Alexander Rd #25",
        "locality": "PTV GTFS",
        "position": [
          -37.78244033,
          144.93394058
        ]
      },
      {
        "name": "Mooltan St/Mt Alexander Rd #24",
        "locality": "PTV GTFS",
        "position": [
          -37.78393582,
          144.93699879
        ]
      },
      {
        "name": "Djerring Flemington Hub/Mt Alexander Rd  #23",
        "locality": "PTV GTFS",
        "position": [
          -37.78592738,
          144.93905545
        ]
      },
      {
        "name": "Flemington Bridge Station/Flemington Rd #22",
        "locality": "PTV GTFS",
        "position": [
          -37.78827623,
          144.94093197
        ]
      },
      {
        "name": "Melrose St/Flemington Rd #20",
        "locality": "PTV GTFS",
        "position": [
          -37.79050222,
          144.94351607
        ]
      },
      {
        "name": "Royal Childrens Hospital/Flemington Rd #19",
        "locality": "PTV GTFS",
        "position": [
          -37.79428158,
          144.94836266
        ]
      },
      {
        "name": "Murphy St/Flemington Rd #15",
        "locality": "PTV GTFS",
        "position": [
          -37.79748768,
          144.95238514
        ]
      },
      {
        "name": "Royal Melbourne Hospital/Flemington Rd #14",
        "locality": "PTV GTFS",
        "position": [
          -37.79947767,
          144.95488555
        ]
      },
      {
        "name": "Pelham St/Elizabeth St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.80214829,
          144.95766265
        ]
      },
      {
        "name": "Queen Victoria Market/Elizabeth St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.80680848,
          144.95980592
        ]
      },
      {
        "name": "Melbourne Central Station/Elizabeth St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81101433,
          144.96173476
        ]
      },
      {
        "name": "Bourke Street Mall/Elizabeth St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81387585,
          144.96305327
        ]
      },
      {
        "name": "Collins St/Elizabeth St #2",
        "locality": "PTV GTFS",
        "position": [
          -37.81583776,
          144.9639422
        ]
      },
      {
        "name": "Flinders Street Railway Station/Elizabeth St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81789895,
          144.9648398
        ]
      }
    ]
  },
  {
    "routeLabel": "70",
    "longName": "Waterfront City Docklands - Wattle Park",
    "color": "F59BBB",
    "forwardDestination": "Wattle Park",
    "reverseDestination": "Waterfront City Docklands",
    "forwardStops": [
      {
        "name": "Waterfront City/Docklands Dr #D11",
        "locality": "PTV GTFS",
        "position": [
          -37.81434514,
          144.93875383
        ]
      },
      {
        "name": "NewQuay Prom/Docklands Dr #D10",
        "locality": "PTV GTFS",
        "position": [
          -37.81331193,
          144.9415088
        ]
      },
      {
        "name": "Central Pier/Harbour Esp #D2",
        "locality": "PTV GTFS",
        "position": [
          -37.81470491,
          144.94490068
        ]
      },
      {
        "name": "Stadium Precinct - Bourke St/Harbour Esp #D3",
        "locality": "PTV GTFS",
        "position": [
          -37.8178194,
          144.94624566
        ]
      },
      {
        "name": "Docklands Park/Harbour Esp #D4",
        "locality": "PTV GTFS",
        "position": [
          -37.82146591,
          144.94761009
        ]
      },
      {
        "name": "South Wharf/Wurundjeri Way #D5",
        "locality": "PTV GTFS",
        "position": [
          -37.82183505,
          144.95121254
        ]
      },
      {
        "name": "Flinders Street West/Flinders St #D6",
        "locality": "PTV GTFS",
        "position": [
          -37.82147119,
          144.95360832
        ]
      },
      {
        "name": "Spencer St/Flinders St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.82083429,
          144.95585256
        ]
      },
      {
        "name": "Melbourne Aquarium/Flinders St #2",
        "locality": "PTV GTFS",
        "position": [
          -37.82010925,
          144.9582128
        ]
      },
      {
        "name": "Market St/Flinders St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81906291,
          144.96179738
        ]
      },
      {
        "name": "Elizabeth St/Flinders St #4",
        "locality": "PTV GTFS",
        "position": [
          -37.8182377,
          144.96462602
        ]
      },
      {
        "name": "Swanston St/Flinders St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81756006,
          144.96713247
        ]
      },
      {
        "name": "Russell St/Flinders St #6",
        "locality": "PTV GTFS",
        "position": [
          -37.81642552,
          144.97084417
        ]
      },
      {
        "name": "William Barak Bridge/Melbourne Park #7A",
        "locality": "PTV GTFS",
        "position": [
          -37.81816692,
          144.97620389
        ]
      },
      {
        "name": "Rod Laver Arena/MCG Gates 1-3 #7B",
        "locality": "PTV GTFS",
        "position": [
          -37.81958697,
          144.97913015
        ]
      },
      {
        "name": "MCG Gates 4-7/John Cain Arena #7C",
        "locality": "PTV GTFS",
        "position": [
          -37.82238396,
          144.98352999
        ]
      },
      {
        "name": "Olympic Boulevard #7D",
        "locality": "PTV GTFS",
        "position": [
          -37.8241351,
          144.98685655
        ]
      },
      {
        "name": "Richmond Station/Swan St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.82464599,
          144.98933075
        ]
      },
      {
        "name": "Lennox St/Swan St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.82509192,
          144.9932837
        ]
      },
      {
        "name": "Swan Street Shopping Centre/Swan St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.82537981,
          144.99590035
        ]
      },
      {
        "name": "Church St/Swan St #11",
        "locality": "PTV GTFS",
        "position": [
          -37.82561005,
          144.99778009
        ]
      },
      {
        "name": "Coppin St/Swan St #12",
        "locality": "PTV GTFS",
        "position": [
          -37.82610214,
          145.00234542
        ]
      },
      {
        "name": "Edinburgh St/Swan St #13",
        "locality": "PTV GTFS",
        "position": [
          -37.82639233,
          145.00510977
        ]
      },
      {
        "name": "Burnley St/Swan St #14",
        "locality": "PTV GTFS",
        "position": [
          -37.82659348,
          145.00687674
        ]
      },
      {
        "name": "Stawell St/Swan St #15",
        "locality": "PTV GTFS",
        "position": [
          -37.82690101,
          145.00960659
        ]
      },
      {
        "name": "Park Gr/Swan St #16",
        "locality": "PTV GTFS",
        "position": [
          -37.8271985,
          145.01227992
        ]
      },
      {
        "name": "Madden Gr/Swan St #17",
        "locality": "PTV GTFS",
        "position": [
          -37.82724846,
          145.01684592
        ]
      },
      {
        "name": "Yarra Bvd/Swan St #18",
        "locality": "PTV GTFS",
        "position": [
          -37.82641976,
          145.02061738
        ]
      },
      {
        "name": "Power St/Riversdale Rd #29",
        "locality": "PTV GTFS",
        "position": [
          -37.82761428,
          145.02574364
        ]
      },
      {
        "name": "Through St/Riversdale Rd #30",
        "locality": "PTV GTFS",
        "position": [
          -37.82807576,
          145.02908305
        ]
      },
      {
        "name": "Fordholm Rd/Riversdale Rd #31",
        "locality": "PTV GTFS",
        "position": [
          -37.82835063,
          145.03150715
        ]
      },
      {
        "name": "Glenferrie Rd/Riversdale Rd #32",
        "locality": "PTV GTFS",
        "position": [
          -37.82863483,
          145.03395374
        ]
      },
      {
        "name": "Berkeley St/Riversdale Rd #33",
        "locality": "PTV GTFS",
        "position": [
          -37.82897064,
          145.03679666
        ]
      },
      {
        "name": "Kooyongkoot Rd/Riversdale Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.82917882,
          145.0384727
        ]
      },
      {
        "name": "Robinson Rd/Riversdale Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.82953651,
          145.04155368
        ]
      },
      {
        "name": "Auburn Rd/Riversdale Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.82977617,
          145.0435016
        ]
      },
      {
        "name": "Tooronga Rd/Riversdale Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.83025934,
          145.047636
        ]
      },
      {
        "name": "Hastings Rd/Riversdale Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.8306902,
          145.05134006
        ]
      },
      {
        "name": "Camberwell Tram Depot/Riversdale Rd #39",
        "locality": "PTV GTFS",
        "position": [
          -37.83107214,
          145.05427282
        ]
      },
      {
        "name": "Camberwell Junction/Riversdale Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.83126992,
          145.05642645
        ]
      },
      {
        "name": "Camberwell Market/Riversdale Rd #41",
        "locality": "PTV GTFS",
        "position": [
          -37.83140689,
          145.05762726
        ]
      },
      {
        "name": "Fermanagh Rd/Riversdale Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.83168361,
          145.06019925
        ]
      },
      {
        "name": "Trafalgar Rd/Riversdale Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.83206249,
          145.06350714
        ]
      },
      {
        "name": "Derby St/Riversdale Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.8323359,
          145.0658861
        ]
      },
      {
        "name": "Riversdale Station/Riversdale Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.83269847,
          145.0693081
        ]
      },
      {
        "name": "Willow Gr/Riversdale Rd #47",
        "locality": "PTV GTFS",
        "position": [
          -37.8331096,
          145.07239936
        ]
      },
      {
        "name": "Cooloongatta Rd/Riversdale Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.8336551,
          145.07710066
        ]
      },
      {
        "name": "Glyndon Rd/Riversdale Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.8338898,
          145.07933301
        ]
      },
      {
        "name": "Wattle Valley Rd/Riversdale Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.83411853,
          145.08120193
        ]
      },
      {
        "name": "Highfield Rd/Riversdale Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.83436725,
          145.0848543
        ]
      },
      {
        "name": "Lockhart St/Riversdale Rd #52",
        "locality": "PTV GTFS",
        "position": [
          -37.83475409,
          145.08813951
        ]
      },
      {
        "name": "Essex Rd/Riversdale Rd #53",
        "locality": "PTV GTFS",
        "position": [
          -37.83508806,
          145.09094889
        ]
      },
      {
        "name": "Through Rd/Riversdale Rd #54",
        "locality": "PTV GTFS",
        "position": [
          -37.8353407,
          145.09319223
        ]
      },
      {
        "name": "Union Rd/Riversdale Rd #55",
        "locality": "PTV GTFS",
        "position": [
          -37.83557473,
          145.09540199
        ]
      },
      {
        "name": "Warrigal Rd/Riversdale Rd #56",
        "locality": "PTV GTFS",
        "position": [
          -37.83589695,
          145.09805265
        ]
      },
      {
        "name": "Glendale St/Riversdale Rd #57",
        "locality": "PTV GTFS",
        "position": [
          -37.83620369,
          145.10030602
        ]
      },
      {
        "name": "Wattle Park/Riversdale Rd #58",
        "locality": "PTV GTFS",
        "position": [
          -37.83653137,
          145.10218389
        ]
      },
      {
        "name": "Alandale St/Riversdale Rd #59",
        "locality": "PTV GTFS",
        "position": [
          -37.83685934,
          145.1046413
        ]
      },
      {
        "name": "Ferndale St/Riversdale Rd #60",
        "locality": "PTV GTFS",
        "position": [
          -37.83709005,
          145.10665805
        ]
      },
      {
        "name": "Elgar Rd/Riversdale Rd #61",
        "locality": "PTV GTFS",
        "position": [
          -37.83760932,
          145.11037193
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "Elgar Rd/Riversdale Rd #61",
        "locality": "PTV GTFS",
        "position": [
          -37.83760932,
          145.11037193
        ]
      },
      {
        "name": "Ferndale St/Riversdale Rd #60",
        "locality": "PTV GTFS",
        "position": [
          -37.8372077,
          145.10668913
        ]
      },
      {
        "name": "Alandale St/Riversdale Rd #59",
        "locality": "PTV GTFS",
        "position": [
          -37.8369972,
          145.10480822
        ]
      },
      {
        "name": "Wattle Park/Riversdale Rd #58",
        "locality": "PTV GTFS",
        "position": [
          -37.83675452,
          145.10260998
        ]
      },
      {
        "name": "Glendale St/Riversdale Rd #57",
        "locality": "PTV GTFS",
        "position": [
          -37.83627117,
          145.10002021
        ]
      },
      {
        "name": "Warrigal Rd/Riversdale Rd #56",
        "locality": "PTV GTFS",
        "position": [
          -37.8360646,
          145.09838923
        ]
      },
      {
        "name": "Union Rd/Riversdale Rd #55",
        "locality": "PTV GTFS",
        "position": [
          -37.83576169,
          145.09581761
        ]
      },
      {
        "name": "Through Rd/Riversdale Rd #54",
        "locality": "PTV GTFS",
        "position": [
          -37.83553079,
          145.09380094
        ]
      },
      {
        "name": "Essex Rd/Riversdale Rd #53",
        "locality": "PTV GTFS",
        "position": [
          -37.83521454,
          145.09096835
        ]
      },
      {
        "name": "Lockhart St/Riversdale Rd #52",
        "locality": "PTV GTFS",
        "position": [
          -37.83492269,
          145.08853286
        ]
      },
      {
        "name": "Highfield Rd/Riversdale Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.8345342,
          145.08514541
        ]
      },
      {
        "name": "Wattle Valley Rd/Riversdale Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.83429487,
          145.08151552
        ]
      },
      {
        "name": "Glyndon Rd/Riversdale Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.83408416,
          145.07964613
        ]
      },
      {
        "name": "Cooloongatta Rd/Riversdale Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.83379263,
          145.0772448
        ]
      },
      {
        "name": "Willow Gr/Riversdale Rd #47",
        "locality": "PTV GTFS",
        "position": [
          -37.83327621,
          145.07266772
        ]
      },
      {
        "name": "Riversdale Station/Riversdale Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.83294199,
          145.06986988
        ]
      },
      {
        "name": "Derby St/Riversdale Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.83248302,
          145.06606406
        ]
      },
      {
        "name": "Trafalgar Rd/Riversdale Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.83224844,
          145.06385451
        ]
      },
      {
        "name": "Fermanagh Rd/Riversdale Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.83182755,
          145.06018411
        ]
      },
      {
        "name": "Camberwell Junction/Riversdale Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.8314891,
          145.05714789
        ]
      },
      {
        "name": "Camberwell Tram Depot/Riversdale Rd #39",
        "locality": "PTV GTFS",
        "position": [
          -37.83121589,
          145.05479171
        ]
      },
      {
        "name": "Hastings Rd/Riversdale Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.83083902,
          145.0516202
        ]
      },
      {
        "name": "Tooronga Rd/Riversdale Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.83038003,
          145.04784869
        ]
      },
      {
        "name": "Auburn Rd/Riversdale Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.82994303,
          145.04378124
        ]
      },
      {
        "name": "Robinson Rd/Riversdale Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.82966224,
          145.04152763
        ]
      },
      {
        "name": "Kooyongkoot Rd/Riversdale Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.82930776,
          145.03863971
        ]
      },
      {
        "name": "Berkeley St/Riversdale Rd #33",
        "locality": "PTV GTFS",
        "position": [
          -37.82915856,
          145.03725751
        ]
      },
      {
        "name": "Glenferrie Rd/Riversdale Rd #32",
        "locality": "PTV GTFS",
        "position": [
          -37.82884172,
          145.0344709
        ]
      },
      {
        "name": "Fordholm Rd/Riversdale Rd #31",
        "locality": "PTV GTFS",
        "position": [
          -37.82850585,
          145.031628
        ]
      },
      {
        "name": "Through St/Riversdale Rd #30",
        "locality": "PTV GTFS",
        "position": [
          -37.82821069,
          145.02906809
        ]
      },
      {
        "name": "Power St/Riversdale Rd #29",
        "locality": "PTV GTFS",
        "position": [
          -37.82739295,
          145.02544278
        ]
      },
      {
        "name": "Yarra Bvd/Swan St #18",
        "locality": "PTV GTFS",
        "position": [
          -37.82666322,
          145.01955426
        ]
      },
      {
        "name": "Madden Gr/Swan St #17",
        "locality": "PTV GTFS",
        "position": [
          -37.82746811,
          145.01651056
        ]
      },
      {
        "name": "Park Gr/Swan St #16",
        "locality": "PTV GTFS",
        "position": [
          -37.82726212,
          145.0117783
        ]
      },
      {
        "name": "Stawell St/Swan St #15",
        "locality": "PTV GTFS",
        "position": [
          -37.8270482,
          145.00978442
        ]
      },
      {
        "name": "Burnley St/Swan St #14",
        "locality": "PTV GTFS",
        "position": [
          -37.82679091,
          145.00735997
        ]
      },
      {
        "name": "Edinburgh St/Swan St #13",
        "locality": "PTV GTFS",
        "position": [
          -37.82650597,
          145.00490221
        ]
      },
      {
        "name": "Coppin St/Swan St #12",
        "locality": "PTV GTFS",
        "position": [
          -37.82625932,
          145.00257977
        ]
      },
      {
        "name": "Church St/Swan St #11",
        "locality": "PTV GTFS",
        "position": [
          -37.82575958,
          144.99809416
        ]
      },
      {
        "name": "Swan Street Shopping Centre/Swan St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.82552664,
          144.99605543
        ]
      },
      {
        "name": "Lennox St/Swan St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.82523953,
          144.9934842
        ]
      },
      {
        "name": "Richmond Station/Swan St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.82469945,
          144.98929522
        ]
      },
      {
        "name": "Olympic Boulevard #7D",
        "locality": "PTV GTFS",
        "position": [
          -37.8238269,
          144.98675132
        ]
      },
      {
        "name": "MCG Gates 4-7/John Cain Arena #7C",
        "locality": "PTV GTFS",
        "position": [
          -37.82213712,
          144.98279826
        ]
      },
      {
        "name": "Rod Laver Arena/MCG Gates 1-3 #7B",
        "locality": "PTV GTFS",
        "position": [
          -37.8193495,
          144.97842093
        ]
      },
      {
        "name": "William Barak Bridge/Melbourne Park #7A",
        "locality": "PTV GTFS",
        "position": [
          -37.81832261,
          144.97582475
        ]
      },
      {
        "name": "Russell St/Flinders St #6",
        "locality": "PTV GTFS",
        "position": [
          -37.81665933,
          144.9702925
        ]
      },
      {
        "name": "Swanston St/Flinders St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81775625,
          144.96649093
        ]
      },
      {
        "name": "Elizabeth St/Flinders St #4",
        "locality": "PTV GTFS",
        "position": [
          -37.81841196,
          144.96428043
        ]
      },
      {
        "name": "Market St/Flinders St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81930627,
          144.96127947
        ]
      },
      {
        "name": "Melbourne Aquarium/Flinders St #2",
        "locality": "PTV GTFS",
        "position": [
          -37.82030972,
          144.95782102
        ]
      },
      {
        "name": "Spencer St/Flinders St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.82105139,
          144.95538079
        ]
      },
      {
        "name": "Victoria Police Centre/Flinders St #D6",
        "locality": "PTV GTFS",
        "position": [
          -37.82172569,
          144.95321503
        ]
      },
      {
        "name": "South Wharf/Wurundjeri Way #D5",
        "locality": "PTV GTFS",
        "position": [
          -37.82200105,
          144.95091257
        ]
      },
      {
        "name": "Docklands Park/Harbour Esp #D4",
        "locality": "PTV GTFS",
        "position": [
          -37.82172534,
          144.94750066
        ]
      },
      {
        "name": "Stadium Precinct - Bourke St/Harbour Esp #D3",
        "locality": "PTV GTFS",
        "position": [
          -37.81746297,
          144.94596018
        ]
      },
      {
        "name": "Central Pier/Harbour Esp #D2",
        "locality": "PTV GTFS",
        "position": [
          -37.8142488,
          144.9445839
        ]
      },
      {
        "name": "New Quay Prom/Docklands Dr #D10",
        "locality": "PTV GTFS",
        "position": [
          -37.81378105,
          144.94050751
        ]
      },
      {
        "name": "Waterfront City/Docklands Dr #D11",
        "locality": "PTV GTFS",
        "position": [
          -37.81455555,
          144.93841856
        ]
      }
    ]
  },
  {
    "routeLabel": "72",
    "longName": "Camberwell - Melbourne University",
    "color": "9ABEAA",
    "forwardDestination": "Melbourne University",
    "reverseDestination": "Camberwell",
    "forwardStops": [
      {
        "name": "Cotham Rd/Burke Rd #70",
        "locality": "PTV GTFS",
        "position": [
          -37.8108727,
          145.06059636
        ]
      },
      {
        "name": "Peverill St/Burke Rd #69",
        "locality": "PTV GTFS",
        "position": [
          -37.81410829,
          145.06006867
        ]
      },
      {
        "name": "Mont Albert Rd/Burke Rd #68",
        "locality": "PTV GTFS",
        "position": [
          -37.81574345,
          145.05976459
        ]
      },
      {
        "name": "Camberwell Girls Grammar/Burke Rd #67",
        "locality": "PTV GTFS",
        "position": [
          -37.81849222,
          145.05922684
        ]
      },
      {
        "name": "Canterbury Rd/Burke Rd #66",
        "locality": "PTV GTFS",
        "position": [
          -37.82128659,
          145.05872194
        ]
      },
      {
        "name": "Victoria Rd/Burke Rd #65",
        "locality": "PTV GTFS",
        "position": [
          -37.8234337,
          145.05831349
        ]
      },
      {
        "name": "Camberwell Station/Burke Rd #64",
        "locality": "PTV GTFS",
        "position": [
          -37.82596683,
          145.05781536
        ]
      },
      {
        "name": "Prospect Hill Rd/Burke Rd #63",
        "locality": "PTV GTFS",
        "position": [
          -37.82802422,
          145.05743192
        ]
      },
      {
        "name": "Camberwell Junction/Burke Rd #61",
        "locality": "PTV GTFS",
        "position": [
          -37.83108751,
          145.05684028
        ]
      },
      {
        "name": "Seymour Gr/Burke Rd #59",
        "locality": "PTV GTFS",
        "position": [
          -37.83519327,
          145.0560735
        ]
      },
      {
        "name": "Currajong Ave/Burke Rd #58",
        "locality": "PTV GTFS",
        "position": [
          -37.83808595,
          145.05552031
        ]
      },
      {
        "name": "Pine Ave/Burke Rd #57",
        "locality": "PTV GTFS",
        "position": [
          -37.84006226,
          145.05513886
        ]
      },
      {
        "name": "Anderson Rd/Burke Rd #56",
        "locality": "PTV GTFS",
        "position": [
          -37.84158948,
          145.05484874
        ]
      },
      {
        "name": "Middle Rd/Burke Rd #55",
        "locality": "PTV GTFS",
        "position": [
          -37.84365567,
          145.05445353
        ]
      },
      {
        "name": "Toorak Rd/Burke Rd #54",
        "locality": "PTV GTFS",
        "position": [
          -37.84561414,
          145.05408385
        ]
      },
      {
        "name": "Bickleigh St/Burke Rd #52",
        "locality": "PTV GTFS",
        "position": [
          -37.84988051,
          145.05322159
        ]
      },
      {
        "name": "Gardiner Station/Burke Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.85306142,
          145.05266056
        ]
      },
      {
        "name": "Glenarm Rd/Malvern Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.85441763,
          145.05129508
        ]
      },
      {
        "name": "Belmont Ave/Malvern Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.85404554,
          145.04841798
        ]
      },
      {
        "name": "Edgar St/Malvern Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.85373233,
          145.04583486
        ]
      },
      {
        "name": "Tooronga Rd/Malvern Rd #47",
        "locality": "PTV GTFS",
        "position": [
          -37.85330411,
          145.0423001
        ]
      },
      {
        "name": "Shaftesbury Ave/Malvern Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.85285871,
          145.03882266
        ]
      },
      {
        "name": "Elizabeth St/Malvern Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.85243389,
          145.03550384
        ]
      },
      {
        "name": "Plant St/Malvern Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.8520838,
          145.03288772
        ]
      },
      {
        "name": "Glenferrie Rd/Malvern Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.85168017,
          145.03030715
        ]
      },
      {
        "name": "Lauriston Girls School/Malvern Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.85119002,
          145.02633099
        ]
      },
      {
        "name": "Murray St/Malvern Rd #41",
        "locality": "PTV GTFS",
        "position": [
          -37.85087919,
          145.02391849
        ]
      },
      {
        "name": "Kooyong Rd/Malvern Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.85058785,
          145.02159641
        ]
      },
      {
        "name": "Densham Rd/Malvern Rd #39",
        "locality": "PTV GTFS",
        "position": [
          -37.85015603,
          145.01842573
        ]
      },
      {
        "name": "Clendon Rd/Malvern Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.8497841,
          145.0156058
        ]
      },
      {
        "name": "Orrong Rd/Malvern Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.84937971,
          145.01246855
        ]
      },
      {
        "name": "Canterbury Rd/Malvern Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.84894802,
          145.0093207
        ]
      },
      {
        "name": "Lorne Rd/Malvern Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.8485937,
          145.00648903
        ]
      },
      {
        "name": "Williams Rd/Malvern Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.84819004,
          145.00340868
        ]
      },
      {
        "name": "Hobson St/Malvern Rd #33",
        "locality": "PTV GTFS",
        "position": [
          -37.84788144,
          145.00115543
        ]
      },
      {
        "name": "Bendigo St/Malvern Rd #32",
        "locality": "PTV GTFS",
        "position": [
          -37.84745004,
          144.99804181
        ]
      },
      {
        "name": "Chapel St/Malvern Rd #31",
        "locality": "PTV GTFS",
        "position": [
          -37.8469343,
          144.99421454
        ]
      },
      {
        "name": "Prahran Market/Commercial Rd #30",
        "locality": "PTV GTFS",
        "position": [
          -37.84670554,
          144.99242514
        ]
      },
      {
        "name": "Porter St/Commercial Rd #29",
        "locality": "PTV GTFS",
        "position": [
          -37.84651413,
          144.9907143
        ]
      },
      {
        "name": "Braille Library/Commercial Rd #28",
        "locality": "PTV GTFS",
        "position": [
          -37.84607267,
          144.98755561
        ]
      },
      {
        "name": "Punt Rd/Commercial Rd #27",
        "locality": "PTV GTFS",
        "position": [
          -37.84577026,
          144.98515459
        ]
      },
      {
        "name": "Alfred Hospital/Commercial Rd #26",
        "locality": "PTV GTFS",
        "position": [
          -37.84536112,
          144.98231329
        ]
      },
      {
        "name": "Commercial Rd/St Kilda Rd #25",
        "locality": "PTV GTFS",
        "position": [
          -37.84401326,
          144.97833851
        ]
      },
      {
        "name": "Leopold St/St Kilda Rd #24",
        "locality": "PTV GTFS",
        "position": [
          -37.84148319,
          144.97741896
        ]
      },
      {
        "name": "Arthur St/St Kilda Rd #23",
        "locality": "PTV GTFS",
        "position": [
          -37.83929754,
          144.97661506
        ]
      },
      {
        "name": "Toorak Rd/St Kilda Rd #22",
        "locality": "PTV GTFS",
        "position": [
          -37.83547648,
          144.97503778
        ]
      },
      {
        "name": "Anzac Station/St Kilda Rd #20",
        "locality": "PTV GTFS",
        "position": [
          -37.83321372,
          144.97237268
        ]
      },
      {
        "name": "Shrine of Remembrance/St Kilda Rd #19",
        "locality": "PTV GTFS",
        "position": [
          -37.82893146,
          144.97122876
        ]
      },
      {
        "name": "Grant St-Police Memorial/St Kilda Rd #17",
        "locality": "PTV GTFS",
        "position": [
          -37.8242787,
          144.97054956
        ]
      },
      {
        "name": "Arts Precinct/St Kilda Rd #14",
        "locality": "PTV GTFS",
        "position": [
          -37.82151653,
          144.96923923
        ]
      },
      {
        "name": "Federation Square/Swanston St #13",
        "locality": "PTV GTFS",
        "position": [
          -37.81806508,
          144.96767526
        ]
      },
      {
        "name": "City Square/Swanston St #11",
        "locality": "PTV GTFS",
        "position": [
          -37.81572996,
          144.96656925
        ]
      },
      {
        "name": "Bourke Street Mall/Swanston St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.81275921,
          144.96518542
        ]
      },
      {
        "name": "Melbourne Central Station/Swanston St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.80988909,
          144.9638898
        ]
      },
      {
        "name": "RMIT University/Swanston St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.80779872,
          144.96286817
        ]
      },
      {
        "name": "Queensberry St/Swanston St #4",
        "locality": "PTV GTFS",
        "position": [
          -37.80513545,
          144.96311173
        ]
      },
      {
        "name": "Lincoln Square/Swanston St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.80262884,
          144.9635554
        ]
      },
      {
        "name": "Melbourne University/Swanston St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.79876562,
          144.96424072
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "Melbourne University/Swanston St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.79930548,
          144.96419183
        ]
      },
      {
        "name": "Lincoln Square/Swanston St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.80236978,
          144.96368745
        ]
      },
      {
        "name": "Queensberry St/Swanston St #4",
        "locality": "PTV GTFS",
        "position": [
          -37.80569411,
          144.96310774
        ]
      },
      {
        "name": "RMIT University/Swanston St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.80813946,
          144.96329043
        ]
      },
      {
        "name": "Melbourne Central Station/Swanston St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.81038237,
          144.96427381
        ]
      },
      {
        "name": "Bourke Street Mall/Swanston St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.81319863,
          144.96558229
        ]
      },
      {
        "name": "City Square/Swanston St #11",
        "locality": "PTV GTFS",
        "position": [
          -37.81637753,
          144.96701723
        ]
      },
      {
        "name": "Federation Square/Swanston St #13",
        "locality": "PTV GTFS",
        "position": [
          -37.81847551,
          144.96795936
        ]
      },
      {
        "name": "Arts Precinct/St Kilda Rd #14",
        "locality": "PTV GTFS",
        "position": [
          -37.8218457,
          144.96951422
        ]
      },
      {
        "name": "Grant St-Police Memorial/St Kilda Rd #17",
        "locality": "PTV GTFS",
        "position": [
          -37.82474278,
          144.97080951
        ]
      },
      {
        "name": "Shrine of Remembrance/St Kilda Rd #19",
        "locality": "PTV GTFS",
        "position": [
          -37.82879869,
          144.97136874
        ]
      },
      {
        "name": "Anzac Station/St Kilda Rd #20",
        "locality": "PTV GTFS",
        "position": [
          -37.83366407,
          144.9734057
        ]
      },
      {
        "name": "Toorak Rd/St Kilda Rd #22",
        "locality": "PTV GTFS",
        "position": [
          -37.83595132,
          144.97539977
        ]
      },
      {
        "name": "Arthur St/St Kilda Rd #23",
        "locality": "PTV GTFS",
        "position": [
          -37.8388552,
          144.97657033
        ]
      },
      {
        "name": "Leopold St/St Kilda Rd #24",
        "locality": "PTV GTFS",
        "position": [
          -37.84115853,
          144.97740511
        ]
      },
      {
        "name": "Commercial Rd/St Kilda Rd #25",
        "locality": "PTV GTFS",
        "position": [
          -37.84452295,
          144.97863142
        ]
      },
      {
        "name": "Alfred Hospital/Commercial Rd #26",
        "locality": "PTV GTFS",
        "position": [
          -37.8452785,
          144.98222463
        ]
      },
      {
        "name": "Punt Rd/Commercial Rd #27",
        "locality": "PTV GTFS",
        "position": [
          -37.84563009,
          144.98486293
        ]
      },
      {
        "name": "Braille Library/Commercial Rd #28",
        "locality": "PTV GTFS",
        "position": [
          -37.845899,
          144.9874126
        ]
      },
      {
        "name": "Porter St/Commercial Rd #29",
        "locality": "PTV GTFS",
        "position": [
          -37.84631364,
          144.99058337
        ]
      },
      {
        "name": "Prahran Market/Commercial Rd #30",
        "locality": "PTV GTFS",
        "position": [
          -37.84654069,
          144.99227051
        ]
      },
      {
        "name": "Chapel St/Commercial Rd #31",
        "locality": "PTV GTFS",
        "position": [
          -37.84675967,
          144.99401471
        ]
      },
      {
        "name": "Surrey Rd/Malvern Rd #32",
        "locality": "PTV GTFS",
        "position": [
          -37.84729285,
          144.9978074
        ]
      },
      {
        "name": "Francis St/Malvern Rd #33",
        "locality": "PTV GTFS",
        "position": [
          -37.84765291,
          145.00043426
        ]
      },
      {
        "name": "Williams Rd/Malvern Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.84800372,
          145.00305004
        ]
      },
      {
        "name": "Mathoura Rd/Malvern Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.84847987,
          145.00668529
        ]
      },
      {
        "name": "A'Beckett St/Malvern Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.84892332,
          145.00999189
        ]
      },
      {
        "name": "Orrong Rd/Malvern Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.84919284,
          145.01207579
        ]
      },
      {
        "name": "Clendon Rd/Malvern Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.84961775,
          145.01536023
        ]
      },
      {
        "name": "Irving Rd/Malvern Rd #39",
        "locality": "PTV GTFS",
        "position": [
          -37.85005214,
          145.01867854
        ]
      },
      {
        "name": "Kooyong Rd/Malvern Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.85040273,
          145.02130587
        ]
      },
      {
        "name": "Albany Rd/Malvern Rd #41",
        "locality": "PTV GTFS",
        "position": [
          -37.85076266,
          145.0239557
        ]
      },
      {
        "name": "Lauriston Girls School/Malvern Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.85105166,
          145.02614147
        ]
      },
      {
        "name": "Glenferrie Rd/Malvern Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.85154665,
          145.02986746
        ]
      },
      {
        "name": "Plant St/Malvern Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.851897,
          145.0324949
        ]
      },
      {
        "name": "Elizabeth St/Malvern Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.85225933,
          145.03530389
        ]
      },
      {
        "name": "Meredith St/Malvern Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.85278446,
          145.03923379
        ]
      },
      {
        "name": "Tooronga Rd/Malvern Rd #47",
        "locality": "PTV GTFS",
        "position": [
          -37.85312767,
          145.04198653
        ]
      },
      {
        "name": "Edgar St/Malvern Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.85355646,
          145.04555536
        ]
      },
      {
        "name": "Kenilworth Gr/Malvern Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.85389971,
          145.04831953
        ]
      },
      {
        "name": "Burke Rd/Malvern Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.85432174,
          145.05149082
        ]
      },
      {
        "name": "Gardiner Railway Station/Burke Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.85283584,
          145.05264377
        ]
      },
      {
        "name": "Harris Ave/Burke Rd #52",
        "locality": "PTV GTFS",
        "position": [
          -37.84977841,
          145.05304243
        ]
      },
      {
        "name": "Toorak Rd/Burke Rd #54",
        "locality": "PTV GTFS",
        "position": [
          -37.84579993,
          145.05387441
        ]
      },
      {
        "name": "Middle Rd/Burke Rd #55",
        "locality": "PTV GTFS",
        "position": [
          -37.84379642,
          145.05424527
        ]
      },
      {
        "name": "Anderson Rd/Burke Rd #56",
        "locality": "PTV GTFS",
        "position": [
          -37.84185615,
          145.05462582
        ]
      },
      {
        "name": "Pine Ave/Burke Rd #57",
        "locality": "PTV GTFS",
        "position": [
          -37.84025724,
          145.05494056
        ]
      },
      {
        "name": "Leura Gr/Burke Rd #58",
        "locality": "PTV GTFS",
        "position": [
          -37.83816402,
          145.05533644
        ]
      },
      {
        "name": "Pleasant Rd/Burke Rd #59",
        "locality": "PTV GTFS",
        "position": [
          -37.83541453,
          145.05582908
        ]
      },
      {
        "name": "Riversdale Rd/Burke Rd #61",
        "locality": "PTV GTFS",
        "position": [
          -37.83156962,
          145.0565663
        ]
      },
      {
        "name": "Camberwell Shopping Centre/Burke Rd #62",
        "locality": "PTV GTFS",
        "position": [
          -37.83020398,
          145.05681801
        ]
      },
      {
        "name": "Prospect Hill Rd/Burke Rd #63",
        "locality": "PTV GTFS",
        "position": [
          -37.82821902,
          145.0572223
        ]
      },
      {
        "name": "Camberwell Station/Burke Rd #64",
        "locality": "PTV GTFS",
        "position": [
          -37.82605391,
          145.05763129
        ]
      },
      {
        "name": "Victoria Rd/Burke Rd #65",
        "locality": "PTV GTFS",
        "position": [
          -37.82358271,
          145.05805964
        ]
      },
      {
        "name": "Rathmines Rd/Burke Rd #66",
        "locality": "PTV GTFS",
        "position": [
          -37.82148065,
          145.05846692
        ]
      },
      {
        "name": "Camberwell Girls Grammar/Burke Rd #67",
        "locality": "PTV GTFS",
        "position": [
          -37.8185885,
          145.05905391
        ]
      },
      {
        "name": "Mont Albert Rd/Burke Rd #68",
        "locality": "PTV GTFS",
        "position": [
          -37.81599212,
          145.05954224
        ]
      },
      {
        "name": "Sackville St/Burke Rd #69",
        "locality": "PTV GTFS",
        "position": [
          -37.81413214,
          145.05987493
        ]
      },
      {
        "name": "Cotham Rd/Burke Rd #70",
        "locality": "PTV GTFS",
        "position": [
          -37.8108727,
          145.06059636
        ]
      }
    ]
  },
  {
    "routeLabel": "75",
    "longName": "Central Pier Docklands - Vermont South",
    "color": "00A9E0",
    "forwardDestination": "Vermont South",
    "reverseDestination": "Central Pier Docklands",
    "forwardStops": [
      {
        "name": "Central Pier/Harbour Esp #D2",
        "locality": "PTV GTFS",
        "position": [
          -37.81470491,
          144.94490068
        ]
      },
      {
        "name": "Stadium Precinct - Bourke St/Harbour Esp #D3",
        "locality": "PTV GTFS",
        "position": [
          -37.8178194,
          144.94624566
        ]
      },
      {
        "name": "Docklands Park/Harbour Esp #D4",
        "locality": "PTV GTFS",
        "position": [
          -37.82146591,
          144.94761009
        ]
      },
      {
        "name": "South Wharf/Wurundjeri Way #D5",
        "locality": "PTV GTFS",
        "position": [
          -37.82183505,
          144.95121254
        ]
      },
      {
        "name": "Flinders Street West/Flinders St #D6",
        "locality": "PTV GTFS",
        "position": [
          -37.82147119,
          144.95360832
        ]
      },
      {
        "name": "Spencer St/Flinders St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.82083429,
          144.95585256
        ]
      },
      {
        "name": "Melbourne Aquarium/Flinders St #2",
        "locality": "PTV GTFS",
        "position": [
          -37.82010925,
          144.9582128
        ]
      },
      {
        "name": "Market St/Flinders St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81906291,
          144.96179738
        ]
      },
      {
        "name": "Elizabeth St/Flinders St #4",
        "locality": "PTV GTFS",
        "position": [
          -37.8182377,
          144.96462602
        ]
      },
      {
        "name": "Swanston St/Flinders St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81756006,
          144.96713247
        ]
      },
      {
        "name": "Russell St/Flinders St #6",
        "locality": "PTV GTFS",
        "position": [
          -37.81642552,
          144.97084417
        ]
      },
      {
        "name": "Spring St/Flinders St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.81536272,
          144.97454245
        ]
      },
      {
        "name": "Lansdowne St/Wellington Pde #9",
        "locality": "PTV GTFS",
        "position": [
          -37.81545285,
          144.97716407
        ]
      },
      {
        "name": "Jolimont Rd/Wellington Pde #10",
        "locality": "PTV GTFS",
        "position": [
          -37.81575029,
          144.97979141
        ]
      },
      {
        "name": "Jolimont Station-MCG/Wellington Pde #11",
        "locality": "PTV GTFS",
        "position": [
          -37.81630429,
          144.98477463
        ]
      },
      {
        "name": "Simpson St/Wellington Pde #13",
        "locality": "PTV GTFS",
        "position": [
          -37.81654033,
          144.98698338
        ]
      },
      {
        "name": "Punt Rd/Wellington Pde #14",
        "locality": "PTV GTFS",
        "position": [
          -37.81738838,
          144.98967538
        ]
      },
      {
        "name": "Epworth Hospital/Bridge Rd #15",
        "locality": "PTV GTFS",
        "position": [
          -37.81790945,
          144.99380768
        ]
      },
      {
        "name": "Bosisto St/Bridge Rd #17",
        "locality": "PTV GTFS",
        "position": [
          -37.8182715,
          144.99654703
        ]
      },
      {
        "name": "Church St/Bridge Rd #18",
        "locality": "PTV GTFS",
        "position": [
          -37.81847187,
          144.99879093
        ]
      },
      {
        "name": "Richmond Town Hall/Bridge Rd #19",
        "locality": "PTV GTFS",
        "position": [
          -37.81875004,
          145.00137354
        ]
      },
      {
        "name": "Coppin St/Bridge Rd #20",
        "locality": "PTV GTFS",
        "position": [
          -37.81897658,
          145.00357133
        ]
      },
      {
        "name": "Burnley St/Bridge Rd #21",
        "locality": "PTV GTFS",
        "position": [
          -37.81953496,
          145.00887293
        ]
      },
      {
        "name": "Yarra Bvd/Bridge Rd #22",
        "locality": "PTV GTFS",
        "position": [
          -37.82009867,
          145.01396998
        ]
      },
      {
        "name": "Hawthorn Bridge/Bridge Rd #23",
        "locality": "PTV GTFS",
        "position": [
          -37.8199499,
          145.01637102
        ]
      },
      {
        "name": "St James Park/Burwood Rd #25",
        "locality": "PTV GTFS",
        "position": [
          -37.82088436,
          145.02102657
        ]
      },
      {
        "name": "Hawthorn Railway Station/Burwood Rd #26",
        "locality": "PTV GTFS",
        "position": [
          -37.82128654,
          145.02458307
        ]
      },
      {
        "name": "Power St/Burwood Rd #27",
        "locality": "PTV GTFS",
        "position": [
          -37.82146823,
          145.02628233
        ]
      },
      {
        "name": "Wattle Rd/Power St #28",
        "locality": "PTV GTFS",
        "position": [
          -37.82477759,
          145.02586469
        ]
      },
      {
        "name": "Power St/Riversdale Rd #29",
        "locality": "PTV GTFS",
        "position": [
          -37.82761428,
          145.02574364
        ]
      },
      {
        "name": "Through St/Riversdale Rd #30",
        "locality": "PTV GTFS",
        "position": [
          -37.82807576,
          145.02908305
        ]
      },
      {
        "name": "Fordholm Rd/Riversdale Rd #31",
        "locality": "PTV GTFS",
        "position": [
          -37.82835063,
          145.03150715
        ]
      },
      {
        "name": "Glenferrie Rd/Riversdale Rd #32",
        "locality": "PTV GTFS",
        "position": [
          -37.82863483,
          145.03395374
        ]
      },
      {
        "name": "Berkeley St/Riversdale Rd #33",
        "locality": "PTV GTFS",
        "position": [
          -37.82897064,
          145.03679666
        ]
      },
      {
        "name": "Kooyongkoot Rd/Riversdale Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.82917882,
          145.0384727
        ]
      },
      {
        "name": "Robinson Rd/Riversdale Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.82953651,
          145.04155368
        ]
      },
      {
        "name": "Auburn Rd/Riversdale Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.82977617,
          145.0435016
        ]
      },
      {
        "name": "Tooronga Rd/Riversdale Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.83025934,
          145.047636
        ]
      },
      {
        "name": "Hastings Rd/Riversdale Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.8306902,
          145.05134006
        ]
      },
      {
        "name": "Camberwell Tram Depot/Riversdale Rd #39",
        "locality": "PTV GTFS",
        "position": [
          -37.83107214,
          145.05427282
        ]
      },
      {
        "name": "Camberwell Junction/Riversdale Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.83126992,
          145.05642645
        ]
      },
      {
        "name": "Burke Rd/Camberwell Rd #41",
        "locality": "PTV GTFS",
        "position": [
          -37.83208437,
          145.05772312
        ]
      },
      {
        "name": "Camberwell Primary School/Camberwell Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.8330495,
          145.05886814
        ]
      },
      {
        "name": "Camberwell Civic Centre/Camberwell Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.83456557,
          145.06063508
        ]
      },
      {
        "name": "Trafalgar Rd/Camberwell Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.83592438,
          145.06215622
        ]
      },
      {
        "name": "Bowen St/Camberwell Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.83770631,
          145.06420043
        ]
      },
      {
        "name": "Christowel St/Camberwell Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.83940434,
          145.06607647
        ]
      },
      {
        "name": "Maple Cres/Camberwell Rd #47",
        "locality": "PTV GTFS",
        "position": [
          -37.84080886,
          145.06764207
        ]
      },
      {
        "name": "Orrong Cres/Camberwell Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.84212179,
          145.0691192
        ]
      },
      {
        "name": "Tyrone St/Camberwell Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.84414229,
          145.07143027
        ]
      },
      {
        "name": "Fordham Gardens/Camberwell Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.84591394,
          145.073407
        ]
      },
      {
        "name": "Toorak Rd/Camberwell Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.84784261,
          145.0756184
        ]
      },
      {
        "name": "Summerhill Rd/Toorak Rd #52",
        "locality": "PTV GTFS",
        "position": [
          -37.84819985,
          145.07707518
        ]
      },
      {
        "name": "Highfield Rd/Toorak Rd #53",
        "locality": "PTV GTFS",
        "position": [
          -37.84873673,
          145.08181179
        ]
      },
      {
        "name": "Oberwyl Rd/Toorak Rd #54",
        "locality": "PTV GTFS",
        "position": [
          -37.84903867,
          145.08430427
        ]
      },
      {
        "name": "Through Rd/Toorak Rd #55",
        "locality": "PTV GTFS",
        "position": [
          -37.84932124,
          145.08671771
        ]
      },
      {
        "name": "Barkly St/Toorak Rd #56",
        "locality": "PTV GTFS",
        "position": [
          -37.84965636,
          145.08959579
        ]
      },
      {
        "name": "Fairview Ave/Toorak Rd #57",
        "locality": "PTV GTFS",
        "position": [
          -37.84998057,
          145.09236053
        ]
      },
      {
        "name": "Warrigal Rd/Burwood Hwy #58",
        "locality": "PTV GTFS",
        "position": [
          -37.85032824,
          145.09546564
        ]
      },
      {
        "name": "Somers St/Burwood Hwy #59",
        "locality": "PTV GTFS",
        "position": [
          -37.85070045,
          145.09897931
        ]
      },
      {
        "name": "Roslyn St/Burwood Hwy #60",
        "locality": "PTV GTFS",
        "position": [
          -37.85044421,
          145.10208861
        ]
      },
      {
        "name": "Presbyterian Ladies College/Burwood Hwy #61",
        "locality": "PTV GTFS",
        "position": [
          -37.84996708,
          145.1054763
        ]
      },
      {
        "name": "Elgar Rd/Burwood Hwy #62",
        "locality": "PTV GTFS",
        "position": [
          -37.84950531,
          145.10870446
        ]
      },
      {
        "name": "Deakin University/Burwood Hwy #63",
        "locality": "PTV GTFS",
        "position": [
          -37.84998861,
          145.11523847
        ]
      },
      {
        "name": "Station St/Burwood Hwy #64",
        "locality": "PTV GTFS",
        "position": [
          -37.85060583,
          145.12058718
        ]
      },
      {
        "name": "Starling St/Burwood Hwy #65",
        "locality": "PTV GTFS",
        "position": [
          -37.85125956,
          145.12598053
        ]
      },
      {
        "name": "Middleborough Rd/Burwood Hwy #66",
        "locality": "PTV GTFS",
        "position": [
          -37.85202333,
          145.13321241
        ]
      },
      {
        "name": "Old Burwood Rd/Burwood Hwy #67",
        "locality": "PTV GTFS",
        "position": [
          -37.85148705,
          145.1380449
        ]
      },
      {
        "name": "Benwerrin Reserve/Burwood Hwy #68",
        "locality": "PTV GTFS",
        "position": [
          -37.85128631,
          145.14188011
        ]
      },
      {
        "name": "Keats St/Burwood Hwy #69",
        "locality": "PTV GTFS",
        "position": [
          -37.85185073,
          145.14624168
        ]
      },
      {
        "name": "Blackburn Rd/Burwood Hwy #70",
        "locality": "PTV GTFS",
        "position": [
          -37.85269354,
          145.15284677
        ]
      },
      {
        "name": "Sevenoaks Rd/Burwood Hwy #71",
        "locality": "PTV GTFS",
        "position": [
          -37.85359175,
          145.15898463
        ]
      },
      {
        "name": "Lakeside Dr/Burwood Hwy #72",
        "locality": "PTV GTFS",
        "position": [
          -37.85441426,
          145.1660679
        ]
      },
      {
        "name": "Springvale Rd/Burwood Hwy #73",
        "locality": "PTV GTFS",
        "position": [
          -37.85493753,
          145.17015809
        ]
      },
      {
        "name": "Stanley Rd/Burwood Hwy #74",
        "locality": "PTV GTFS",
        "position": [
          -37.85554399,
          145.17497371
        ]
      },
      {
        "name": "Vermont South Shopping Centre/Burwood Hwy #75",
        "locality": "PTV GTFS",
        "position": [
          -37.85641112,
          145.18209037
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "Vermont South Shopping Centre/Burwood Hwy #75",
        "locality": "PTV GTFS",
        "position": [
          -37.8564447,
          145.18193041
        ]
      },
      {
        "name": "Stanley Rd/Burwood Hwy #74",
        "locality": "PTV GTFS",
        "position": [
          -37.8555562,
          145.17459833
        ]
      },
      {
        "name": "Springvale Rd/Burwood Hwy #73",
        "locality": "PTV GTFS",
        "position": [
          -37.85476282,
          145.16819608
        ]
      },
      {
        "name": "Lakeside Dr/Burwood Hwy #72",
        "locality": "PTV GTFS",
        "position": [
          -37.85436493,
          145.16463702
        ]
      },
      {
        "name": "Sevenoaks Rd/Burwood Hwy #71",
        "locality": "PTV GTFS",
        "position": [
          -37.85362086,
          145.15854064
        ]
      },
      {
        "name": "Blackburn Rd/Burwood Hwy #70",
        "locality": "PTV GTFS",
        "position": [
          -37.85257634,
          145.15112211
        ]
      },
      {
        "name": "Highview Gr/Burwood Hwy #69",
        "locality": "PTV GTFS",
        "position": [
          -37.85194242,
          145.14634167
        ]
      },
      {
        "name": "Benwerrin Reserve/Burwood Hwy #68",
        "locality": "PTV GTFS",
        "position": [
          -37.8513789,
          145.1420369
        ]
      },
      {
        "name": "Old Burwood Rd/Burwood Hwy #67",
        "locality": "PTV GTFS",
        "position": [
          -37.851482,
          145.13829507
        ]
      },
      {
        "name": "Middleborough Rd/Burwood Hwy #66",
        "locality": "PTV GTFS",
        "position": [
          -37.85201954,
          145.13183727
        ]
      },
      {
        "name": "Starling St/Burwood Hwy #65",
        "locality": "PTV GTFS",
        "position": [
          -37.85136408,
          145.12631884
        ]
      },
      {
        "name": "Station St/Burwood Hwy #64",
        "locality": "PTV GTFS",
        "position": [
          -37.85055074,
          145.11939522
        ]
      },
      {
        "name": "Deakin University/Burwood Hwy #63",
        "locality": "PTV GTFS",
        "position": [
          -37.85009225,
          145.11551996
        ]
      },
      {
        "name": "Elgar Rd/Burwood Hwy #62",
        "locality": "PTV GTFS",
        "position": [
          -37.8495912,
          145.10844086
        ]
      },
      {
        "name": "Presbyterian Ladies College/Burwood Hwy #61",
        "locality": "PTV GTFS",
        "position": [
          -37.84997993,
          145.10571464
        ]
      },
      {
        "name": "Millicent St/Burwood Hwy #60",
        "locality": "PTV GTFS",
        "position": [
          -37.85050837,
          145.10215515
        ]
      },
      {
        "name": "Gilmour St/Burwood Hwy #59",
        "locality": "PTV GTFS",
        "position": [
          -37.85074163,
          145.09873958
        ]
      },
      {
        "name": "Warrigal Rd/Burwood Hwy #58",
        "locality": "PTV GTFS",
        "position": [
          -37.85043339,
          145.09583799
        ]
      },
      {
        "name": "Queens Pde/Toorak Rd #57",
        "locality": "PTV GTFS",
        "position": [
          -37.85015779,
          145.09273101
        ]
      },
      {
        "name": "Alfred Rd/Toorak Rd #56",
        "locality": "PTV GTFS",
        "position": [
          -37.84985309,
          145.09005669
        ]
      },
      {
        "name": "Beryl St/Toorak Rd #55",
        "locality": "PTV GTFS",
        "position": [
          -37.84951927,
          145.08725812
        ]
      },
      {
        "name": "Grandview Ave/Toorak Rd #54",
        "locality": "PTV GTFS",
        "position": [
          -37.84919661,
          145.08459567
        ]
      },
      {
        "name": "Lithgow St/Toorak Rd #53",
        "locality": "PTV GTFS",
        "position": [
          -37.84891585,
          145.08229584
        ]
      },
      {
        "name": "Summerhill Rd/Toorak Rd #52",
        "locality": "PTV GTFS",
        "position": [
          -37.84835855,
          145.077412
        ]
      },
      {
        "name": "Smith Rd/Camberwell Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.8459106,
          145.07320252
        ]
      },
      {
        "name": "Wilson Gr/Camberwell Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.84443222,
          145.07152499
        ]
      },
      {
        "name": "Glen Iris Rd/Camberwell Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.84233873,
          145.069159
        ]
      },
      {
        "name": "Orange Gr/Camberwell Rd #47",
        "locality": "PTV GTFS",
        "position": [
          -37.84115415,
          145.06781488
        ]
      },
      {
        "name": "Acheron Ave/Camberwell Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.83981361,
          145.06630441
        ]
      },
      {
        "name": "Bowen St/Camberwell Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.83791349,
          145.06419501
        ]
      },
      {
        "name": "Trafalgar Rd/Camberwell Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.83641698,
          145.06251831
        ]
      },
      {
        "name": "Camberwell Civic Centre/Camberwell Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.83480935,
          145.06066279
        ]
      },
      {
        "name": "Camberwell Primary School/Camberwell Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.83333887,
          145.05892873
        ]
      },
      {
        "name": "Camberwell Junction/Camberwell Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.83159364,
          145.05692926
        ]
      },
      {
        "name": "Camberwell Tram Depot/Riversdale Rd #39",
        "locality": "PTV GTFS",
        "position": [
          -37.83121589,
          145.05479171
        ]
      },
      {
        "name": "Hastings Rd/Riversdale Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.83083902,
          145.0516202
        ]
      },
      {
        "name": "Tooronga Rd/Riversdale Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.83038003,
          145.04784869
        ]
      },
      {
        "name": "Auburn Rd/Riversdale Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.82994303,
          145.04378124
        ]
      },
      {
        "name": "Robinson Rd/Riversdale Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.82966224,
          145.04152763
        ]
      },
      {
        "name": "Kooyongkoot Rd/Riversdale Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.82930776,
          145.03863971
        ]
      },
      {
        "name": "Berkeley St/Riversdale Rd #33",
        "locality": "PTV GTFS",
        "position": [
          -37.82915856,
          145.03725751
        ]
      },
      {
        "name": "Glenferrie Rd/Riversdale Rd #32",
        "locality": "PTV GTFS",
        "position": [
          -37.82884172,
          145.0344709
        ]
      },
      {
        "name": "Fordholm Rd/Riversdale Rd #31",
        "locality": "PTV GTFS",
        "position": [
          -37.82850585,
          145.031628
        ]
      },
      {
        "name": "Through St/Riversdale Rd #30",
        "locality": "PTV GTFS",
        "position": [
          -37.82821069,
          145.02906809
        ]
      },
      {
        "name": "Power St/Riversdale Rd #29",
        "locality": "PTV GTFS",
        "position": [
          -37.82739295,
          145.02544278
        ]
      },
      {
        "name": "Wattle Rd/Power St #28",
        "locality": "PTV GTFS",
        "position": [
          -37.82491023,
          145.02571346
        ]
      },
      {
        "name": "Burwood Rd/Power St #27",
        "locality": "PTV GTFS",
        "position": [
          -37.82174748,
          145.02627489
        ]
      },
      {
        "name": "Hawthorn Railway Station/Burwood Rd #26",
        "locality": "PTV GTFS",
        "position": [
          -37.82145268,
          145.02481722
        ]
      },
      {
        "name": "St James Park/Burwood Rd #25",
        "locality": "PTV GTFS",
        "position": [
          -37.82095795,
          145.02111549
        ]
      },
      {
        "name": "Hawthorn Bridge/Bridge Rd #23",
        "locality": "PTV GTFS",
        "position": [
          -37.82001948,
          145.01622148
        ]
      },
      {
        "name": "Yarra Bvd/Bridge Rd #22",
        "locality": "PTV GTFS",
        "position": [
          -37.82015215,
          145.01340053
        ]
      },
      {
        "name": "Burnley St/Bridge Rd #21",
        "locality": "PTV GTFS",
        "position": [
          -37.8194803,
          145.00777244
        ]
      },
      {
        "name": "Coppin St/Bridge Rd #20",
        "locality": "PTV GTFS",
        "position": [
          -37.81908259,
          145.00397744
        ]
      },
      {
        "name": "Richmond Town Hall/Bridge Rd #19",
        "locality": "PTV GTFS",
        "position": [
          -37.8188131,
          145.00137184
        ]
      },
      {
        "name": "Church St/Bridge Rd #18",
        "locality": "PTV GTFS",
        "position": [
          -37.81861779,
          144.99942316
        ]
      },
      {
        "name": "Waltham St/Bridge Rd #17",
        "locality": "PTV GTFS",
        "position": [
          -37.81829814,
          144.99652359
        ]
      },
      {
        "name": "Epworth Hospital/Bridge Rd #15",
        "locality": "PTV GTFS",
        "position": [
          -37.81802267,
          144.99357741
        ]
      },
      {
        "name": "Punt Rd/Bridge Rd #14",
        "locality": "PTV GTFS",
        "position": [
          -37.81753279,
          144.99021674
        ]
      },
      {
        "name": "Simpson St/Wellington Pde #13",
        "locality": "PTV GTFS",
        "position": [
          -37.81660319,
          144.98697031
        ]
      },
      {
        "name": "Jolimont Station-MCG/Wellington Pde #11",
        "locality": "PTV GTFS",
        "position": [
          -37.81626114,
          144.98383293
        ]
      },
      {
        "name": "Jolimont Rd/Wellington Pde #10",
        "locality": "PTV GTFS",
        "position": [
          -37.81576932,
          144.97932514
        ]
      },
      {
        "name": "Lansdowne St/Wellington Pde #9",
        "locality": "PTV GTFS",
        "position": [
          -37.81547129,
          144.97666374
        ]
      },
      {
        "name": "Spring St/Flinders St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.81553662,
          144.97417418
        ]
      },
      {
        "name": "Russell St/Flinders St #6",
        "locality": "PTV GTFS",
        "position": [
          -37.81665933,
          144.9702925
        ]
      },
      {
        "name": "Swanston St/Flinders St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81775625,
          144.96649093
        ]
      },
      {
        "name": "Elizabeth St/Flinders St #4",
        "locality": "PTV GTFS",
        "position": [
          -37.81841196,
          144.96428043
        ]
      },
      {
        "name": "Market St/Flinders St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81930627,
          144.96127947
        ]
      },
      {
        "name": "Melbourne Aquarium/Flinders St #2",
        "locality": "PTV GTFS",
        "position": [
          -37.82030972,
          144.95782102
        ]
      },
      {
        "name": "Spencer St/Flinders St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.82105139,
          144.95538079
        ]
      },
      {
        "name": "Victoria Police Centre/Flinders St #D6",
        "locality": "PTV GTFS",
        "position": [
          -37.82172569,
          144.95321503
        ]
      },
      {
        "name": "South Wharf/Wurundjeri Way #D5",
        "locality": "PTV GTFS",
        "position": [
          -37.82200105,
          144.95091257
        ]
      },
      {
        "name": "Docklands Park/Harbour Esp #D4",
        "locality": "PTV GTFS",
        "position": [
          -37.82172534,
          144.94750066
        ]
      },
      {
        "name": "Stadium Precinct - Bourke St/Harbour Esp #D3",
        "locality": "PTV GTFS",
        "position": [
          -37.81746297,
          144.94596018
        ]
      },
      {
        "name": "Central Pier/Harbour Esp #D2",
        "locality": "PTV GTFS",
        "position": [
          -37.8142488,
          144.9445839
        ]
      }
    ]
  },
  {
    "routeLabel": "78",
    "longName": "Balaclava - North Richmond",
    "color": "A0A0D6",
    "forwardDestination": "North Richmond",
    "reverseDestination": "Balaclava",
    "forwardStops": [
      {
        "name": "Brighton Rd/Chapel St #36",
        "locality": "PTV GTFS",
        "position": [
          -37.87115338,
          144.98972675
        ]
      },
      {
        "name": "Carlisle St/Chapel St #37",
        "locality": "PTV GTFS",
        "position": [
          -37.86847651,
          144.99023149
        ]
      },
      {
        "name": "Inkerman St/Chapel St #38",
        "locality": "PTV GTFS",
        "position": [
          -37.86544011,
          144.99079142
        ]
      },
      {
        "name": "Argyle St/Chapel St #39",
        "locality": "PTV GTFS",
        "position": [
          -37.8633922,
          144.99118805
        ]
      },
      {
        "name": "Alma Rd/Chapel St #40",
        "locality": "PTV GTFS",
        "position": [
          -37.86157733,
          144.99151014
        ]
      },
      {
        "name": "St Michaels Grammar School/Chapel St #41",
        "locality": "PTV GTFS",
        "position": [
          -37.85952884,
          144.99187264
        ]
      },
      {
        "name": "Dandenong Rd/Chapel St #42",
        "locality": "PTV GTFS",
        "position": [
          -37.85792055,
          144.99215499
        ]
      },
      {
        "name": "Windsor Railway Station/Chapel St #43",
        "locality": "PTV GTFS",
        "position": [
          -37.8562404,
          144.99245063
        ]
      },
      {
        "name": "Duke St/Chapel St #44",
        "locality": "PTV GTFS",
        "position": [
          -37.85410202,
          144.99282688
        ]
      },
      {
        "name": "High St/Chapel St #45",
        "locality": "PTV GTFS",
        "position": [
          -37.85195599,
          144.99328287
        ]
      },
      {
        "name": "Chatham St/Chapel St #46",
        "locality": "PTV GTFS",
        "position": [
          -37.84910601,
          144.99367836
        ]
      },
      {
        "name": "Commercial Rd/Chapel St #47",
        "locality": "PTV GTFS",
        "position": [
          -37.84697624,
          144.99403157
        ]
      },
      {
        "name": "Cliff St/Chapel St #48",
        "locality": "PTV GTFS",
        "position": [
          -37.84383268,
          144.99465086
        ]
      },
      {
        "name": "Arthur St/Chapel St #49",
        "locality": "PTV GTFS",
        "position": [
          -37.84201972,
          144.99508634
        ]
      },
      {
        "name": "Toorak Rd/Chapel St #50",
        "locality": "PTV GTFS",
        "position": [
          -37.8396477,
          144.99550284
        ]
      },
      {
        "name": "Malcolm St/Chapel St #51",
        "locality": "PTV GTFS",
        "position": [
          -37.83696197,
          144.99601871
        ]
      },
      {
        "name": "Howard St/Church St #53",
        "locality": "PTV GTFS",
        "position": [
          -37.8327919,
          144.99668831
        ]
      },
      {
        "name": "Cotter St/Church St #54",
        "locality": "PTV GTFS",
        "position": [
          -37.83050017,
          144.99705707
        ]
      },
      {
        "name": "Adelaide St/Church St #55",
        "locality": "PTV GTFS",
        "position": [
          -37.82897177,
          144.99726883
        ]
      },
      {
        "name": "Swan St/Church St #57",
        "locality": "PTV GTFS",
        "position": [
          -37.82587282,
          144.99786388
        ]
      },
      {
        "name": "Gipps St/Church St #58",
        "locality": "PTV GTFS",
        "position": [
          -37.82405752,
          144.99816288
        ]
      },
      {
        "name": "St Ignatius Church/Church St #59",
        "locality": "PTV GTFS",
        "position": [
          -37.82183804,
          144.99854095
        ]
      },
      {
        "name": "Abinger St/Church St #60",
        "locality": "PTV GTFS",
        "position": [
          -37.82030159,
          144.99880967
        ]
      },
      {
        "name": "Bridge Rd/Church St #61",
        "locality": "PTV GTFS",
        "position": [
          -37.8187291,
          144.99907934
        ]
      },
      {
        "name": "Highett St/Church St #62",
        "locality": "PTV GTFS",
        "position": [
          -37.81596188,
          144.99957438
        ]
      },
      {
        "name": "Tweedie Pl/Church St #63",
        "locality": "PTV GTFS",
        "position": [
          -37.81431791,
          144.99988003
        ]
      },
      {
        "name": "Elizabeth St/Church St #64",
        "locality": "PTV GTFS",
        "position": [
          -37.81259249,
          145.00016514
        ]
      },
      {
        "name": "Victoria St/Church St #65",
        "locality": "PTV GTFS",
        "position": [
          -37.8109146,
          145.00059662
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "Victoria St/Church St #65",
        "locality": "PTV GTFS",
        "position": [
          -37.8109146,
          145.00059662
        ]
      },
      {
        "name": "Baker St/Church St #64",
        "locality": "PTV GTFS",
        "position": [
          -37.81225444,
          145.00042416
        ]
      },
      {
        "name": "Kent St/Church St #63",
        "locality": "PTV GTFS",
        "position": [
          -37.81432962,
          145.00003874
        ]
      },
      {
        "name": "Highett St/Church St #62",
        "locality": "PTV GTFS",
        "position": [
          -37.81574897,
          144.99977324
        ]
      },
      {
        "name": "Bridge Rd/Church St #61",
        "locality": "PTV GTFS",
        "position": [
          -37.81842632,
          144.999292
        ]
      },
      {
        "name": "Abinger St/Church St #60",
        "locality": "PTV GTFS",
        "position": [
          -37.82032211,
          144.9989568
        ]
      },
      {
        "name": "St Ignatius Church/Church St #59",
        "locality": "PTV GTFS",
        "position": [
          -37.82174185,
          144.99871396
        ]
      },
      {
        "name": "Gipps St/Church St #58",
        "locality": "PTV GTFS",
        "position": [
          -37.82372733,
          144.99835358
        ]
      },
      {
        "name": "Swan St/Church St #57",
        "locality": "PTV GTFS",
        "position": [
          -37.82555125,
          144.99803163
        ]
      },
      {
        "name": "East Richmond Railway Station/Church St #56",
        "locality": "PTV GTFS",
        "position": [
          -37.82663847,
          144.99784318
        ]
      },
      {
        "name": "Gibbons St/Church St #55",
        "locality": "PTV GTFS",
        "position": [
          -37.82876768,
          144.99745614
        ]
      },
      {
        "name": "Balmain St/Church St #54",
        "locality": "PTV GTFS",
        "position": [
          -37.83032098,
          144.99711873
        ]
      },
      {
        "name": "Howard St/Church St #53",
        "locality": "PTV GTFS",
        "position": [
          -37.83264855,
          144.99673764
        ]
      },
      {
        "name": "Malcolm St/Chapel St #51",
        "locality": "PTV GTFS",
        "position": [
          -37.8363353,
          144.99626293
        ]
      },
      {
        "name": "Toorak Rd/Chapel St #50",
        "locality": "PTV GTFS",
        "position": [
          -37.83934608,
          144.99578373
        ]
      },
      {
        "name": "Palermo St/Chapel St #49",
        "locality": "PTV GTFS",
        "position": [
          -37.84156226,
          144.99521237
        ]
      },
      {
        "name": "Wilson St/Chapel St #48",
        "locality": "PTV GTFS",
        "position": [
          -37.84363857,
          144.99489477
        ]
      },
      {
        "name": "Malvern Rd/Chapel St #47",
        "locality": "PTV GTFS",
        "position": [
          -37.84670068,
          144.99425496
        ]
      },
      {
        "name": "Chatham St/Chapel St #46",
        "locality": "PTV GTFS",
        "position": [
          -37.84894793,
          144.99392131
        ]
      },
      {
        "name": "High St/Chapel St #45",
        "locality": "PTV GTFS",
        "position": [
          -37.85172528,
          144.9934937
        ]
      },
      {
        "name": "Duke St/Chapel St #44",
        "locality": "PTV GTFS",
        "position": [
          -37.8539886,
          144.9930459
        ]
      },
      {
        "name": "Windsor Railway Station/Chapel St #43",
        "locality": "PTV GTFS",
        "position": [
          -37.8561266,
          144.99264694
        ]
      },
      {
        "name": "Dandenong Rd/Chapel St #42",
        "locality": "PTV GTFS",
        "position": [
          -37.85742039,
          144.99241861
        ]
      },
      {
        "name": "St Michaels Grammar School/Chapel St #41",
        "locality": "PTV GTFS",
        "position": [
          -37.8593792,
          144.9920813
        ]
      },
      {
        "name": "Alma Rd/Chapel St #40",
        "locality": "PTV GTFS",
        "position": [
          -37.86137384,
          144.99173163
        ]
      },
      {
        "name": "Argyle St/Chapel St #39",
        "locality": "PTV GTFS",
        "position": [
          -37.86332363,
          144.99139452
        ]
      },
      {
        "name": "Inkerman St/Chapel St #38",
        "locality": "PTV GTFS",
        "position": [
          -37.86520098,
          144.99103663
        ]
      },
      {
        "name": "Carlisle St/Chapel St #37",
        "locality": "PTV GTFS",
        "position": [
          -37.86816435,
          144.99042185
        ]
      },
      {
        "name": "Brighton Rd/Chapel St #36",
        "locality": "PTV GTFS",
        "position": [
          -37.87115338,
          144.98972675
        ]
      }
    ]
  },
  {
    "routeLabel": "82",
    "longName": "Moonee Ponds - Footscray",
    "color": "D2D755",
    "forwardDestination": "Footscray",
    "reverseDestination": "Moonee Ponds",
    "forwardStops": [
      {
        "name": "Moonee Ponds Junction/Pascoe Vale Rd #32",
        "locality": "PTV GTFS",
        "position": [
          -37.76693466,
          144.92491587
        ]
      },
      {
        "name": "Chaucer St/Ascot Vale Rd #33",
        "locality": "PTV GTFS",
        "position": [
          -37.7700534,
          144.92444269
        ]
      },
      {
        "name": "Maribyrnong Rd/Ascot Vale Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.77245216,
          144.92402367
        ]
      },
      {
        "name": "Moore St/Maribyrnong Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.77233988,
          144.92123398
        ]
      },
      {
        "name": "Union Rd/Maribyrnong Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.7718115,
          144.91632162
        ]
      },
      {
        "name": "Ferguson St/Maribyrnong Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.77141495,
          144.91275662
        ]
      },
      {
        "name": "Bowen St/Maribyrnong Rd #39",
        "locality": "PTV GTFS",
        "position": [
          -37.7710271,
          144.90918005
        ]
      },
      {
        "name": "Epsom Rd/Maribyrnong Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.77063134,
          144.90567187
        ]
      },
      {
        "name": "Maribyrnong Park/Maribyrnong Rd #41",
        "locality": "PTV GTFS",
        "position": [
          -37.7702968,
          144.90257069
        ]
      },
      {
        "name": "Clyde St/Raleigh Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.76982919,
          144.89908732
        ]
      },
      {
        "name": "Van Ness Ave/Raleigh Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.76950591,
          144.89612211
        ]
      },
      {
        "name": "Warrs Rd/Raleigh Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.76905702,
          144.8921842
        ]
      },
      {
        "name": "Maribyrnong Community Centre/Raleigh Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.76873947,
          144.88954811
        ]
      },
      {
        "name": "Rosamond Rd/Raleigh Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.76900299,
          144.88715661
        ]
      },
      {
        "name": "Raleigh Rd/Wests Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.76983672,
          144.88289839
        ]
      },
      {
        "name": "Waterford Ave/Wests Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.77328585,
          144.88226641
        ]
      },
      {
        "name": "Williamson Rd/Wests Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.77493006,
          144.88199242
        ]
      },
      {
        "name": "Highpoint Shopping Centre/Rosamond Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.77629334,
          144.8856434
        ]
      },
      {
        "name": "River St/Rosamond Rd #52",
        "locality": "PTV GTFS",
        "position": [
          -37.77850236,
          144.88520578
        ]
      },
      {
        "name": "Maribyrnong College/River St #53",
        "locality": "PTV GTFS",
        "position": [
          -37.77954548,
          144.88809403
        ]
      },
      {
        "name": "Gordon St/River St #54",
        "locality": "PTV GTFS",
        "position": [
          -37.77991725,
          144.89123988
        ]
      },
      {
        "name": "Lyric St/Gordon St #55",
        "locality": "PTV GTFS",
        "position": [
          -37.78211804,
          144.89134764
        ]
      },
      {
        "name": "Edgewater Square/Gordon St #56",
        "locality": "PTV GTFS",
        "position": [
          -37.78444356,
          144.89087277
        ]
      },
      {
        "name": "Titch St/Gordon St #57",
        "locality": "PTV GTFS",
        "position": [
          -37.78879981,
          144.89006758
        ]
      },
      {
        "name": "Ballarat Rd/Gordon St #58",
        "locality": "PTV GTFS",
        "position": [
          -37.79055091,
          144.88972252
        ]
      },
      {
        "name": "Droop St/Ballarat Rd #59",
        "locality": "PTV GTFS",
        "position": [
          -37.79231292,
          144.8935107
        ]
      },
      {
        "name": "Tiernan St/Droop St #60",
        "locality": "PTV GTFS",
        "position": [
          -37.79461924,
          144.89548933
        ]
      },
      {
        "name": "Geelong Rd/Droop St #61",
        "locality": "PTV GTFS",
        "position": [
          -37.79613795,
          144.89676359
        ]
      },
      {
        "name": "Nicholson St/Droop St #62",
        "locality": "PTV GTFS",
        "position": [
          -37.79927622,
          144.89941162
        ]
      },
      {
        "name": "Leeds St/Hopkins St #63",
        "locality": "PTV GTFS",
        "position": [
          -37.79985278,
          144.90091715
        ]
      },
      {
        "name": "Footscray Station/Leeds St #64",
        "locality": "PTV GTFS",
        "position": [
          -37.80136679,
          144.90091971
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "Footscray Station/Leeds St #64",
        "locality": "PTV GTFS",
        "position": [
          -37.80136679,
          144.90091971
        ]
      },
      {
        "name": "Footscray Market/Leeds St #63",
        "locality": "PTV GTFS",
        "position": [
          -37.80008059,
          144.90105834
        ]
      },
      {
        "name": "Nicholson St/Hopkins St #62",
        "locality": "PTV GTFS",
        "position": [
          -37.79984074,
          144.89973634
        ]
      },
      {
        "name": "Geelong Rd/Droop St #61",
        "locality": "PTV GTFS",
        "position": [
          -37.79679335,
          144.89713113
        ]
      },
      {
        "name": "Tiernan St/Droop St #60",
        "locality": "PTV GTFS",
        "position": [
          -37.79489006,
          144.89551571
        ]
      },
      {
        "name": "Droop St/Ballarat Rd #59",
        "locality": "PTV GTFS",
        "position": [
          -37.79258435,
          144.89357113
        ]
      },
      {
        "name": "Ballarat Rd/Gordon St #58",
        "locality": "PTV GTFS",
        "position": [
          -37.7904758,
          144.88955432
        ]
      },
      {
        "name": "Titch St/Gordon St #57",
        "locality": "PTV GTFS",
        "position": [
          -37.78864405,
          144.88992439
        ]
      },
      {
        "name": "Edgewater Square/Gordon St #56",
        "locality": "PTV GTFS",
        "position": [
          -37.78489825,
          144.89059868
        ]
      },
      {
        "name": "Lyric St/Gordon St #55",
        "locality": "PTV GTFS",
        "position": [
          -37.78224068,
          144.89115113
        ]
      },
      {
        "name": "Gordon St/River St #54",
        "locality": "PTV GTFS",
        "position": [
          -37.78000184,
          144.89093092
        ]
      },
      {
        "name": "Maribyrnong College/River St #53",
        "locality": "PTV GTFS",
        "position": [
          -37.77959402,
          144.88778609
        ]
      },
      {
        "name": "Rosamond Rd/River St #52",
        "locality": "PTV GTFS",
        "position": [
          -37.7793322,
          144.88574983
        ]
      },
      {
        "name": "Highpoint Shopping Centre/Rosamond Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.77603972,
          144.88557115
        ]
      },
      {
        "name": "Wests Rd/Williamson Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.77521214,
          144.88214332
        ]
      },
      {
        "name": "Waterford Ave/Wests Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.77310408,
          144.88218077
        ]
      },
      {
        "name": "Raleigh Rd/Wests Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.76963693,
          144.88281327
        ]
      },
      {
        "name": "Rosamond Rd/Raleigh Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.76888717,
          144.88672852
        ]
      },
      {
        "name": "Randall St/Raleigh Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.76862941,
          144.88893821
        ]
      },
      {
        "name": "Barb St/Raleigh Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.76889124,
          144.89198456
        ]
      },
      {
        "name": "Van Ness Ave/Raleigh Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.76931766,
          144.89567335
        ]
      },
      {
        "name": "Clyde St/Raleigh Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.76969864,
          144.89884126
        ]
      },
      {
        "name": "Maribyrnong Park/Maribyrnong Rd #41",
        "locality": "PTV GTFS",
        "position": [
          -37.77008033,
          144.90205459
        ]
      },
      {
        "name": "Epsom Rd/Maribyrnong Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.7704323,
          144.90512121
        ]
      },
      {
        "name": "Bowen St/Maribyrnong Rd #39",
        "locality": "PTV GTFS",
        "position": [
          -37.77086174,
          144.90900307
        ]
      },
      {
        "name": "Hotham St/Maribyrnong Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.77123617,
          144.91233024
        ]
      },
      {
        "name": "Union Rd/Maribyrnong Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.7717056,
          144.9159386
        ]
      },
      {
        "name": "Moore St/Maribyrnong Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.77221197,
          144.92113538
        ]
      },
      {
        "name": "Ascot Vale Rd/Maribyrnong Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.77247358,
          144.92370518
        ]
      },
      {
        "name": "Chaucer St/Ascot Vale Rd #33",
        "locality": "PTV GTFS",
        "position": [
          -37.7700506,
          144.92428383
        ]
      },
      {
        "name": "Moonee Ponds Junction/Pascoe Vale Rd #32",
        "locality": "PTV GTFS",
        "position": [
          -37.76665343,
          144.92481021
        ]
      }
    ]
  },
  {
    "routeLabel": "86",
    "longName": "Waterfront City Docklands - Bundoora RMIT",
    "color": "FFB500",
    "forwardDestination": "Bundoora RMIT",
    "reverseDestination": "Waterfront City Docklands",
    "forwardStops": [
      {
        "name": "Waterfront City/Docklands Dr #D11",
        "locality": "PTV GTFS",
        "position": [
          -37.81434514,
          144.93875383
        ]
      },
      {
        "name": "NewQuay Prom/Docklands Dr #D10",
        "locality": "PTV GTFS",
        "position": [
          -37.81331193,
          144.9415088
        ]
      },
      {
        "name": "Central Pier/Harbour Esp #D2",
        "locality": "PTV GTFS",
        "position": [
          -37.81470491,
          144.94490068
        ]
      },
      {
        "name": "Docklands Stadium/La Trobe St  #D1",
        "locality": "PTV GTFS",
        "position": [
          -37.81460496,
          144.9464029
        ]
      },
      {
        "name": "Lonsdale St/Spencer St #120",
        "locality": "PTV GTFS",
        "position": [
          -37.81496019,
          144.95231139
        ]
      },
      {
        "name": "Spencer St/Bourke St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81681107,
          144.95406646
        ]
      },
      {
        "name": "William St/Bourke St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81572375,
          144.95787925
        ]
      },
      {
        "name": "Queen St/Bourke St #4",
        "locality": "PTV GTFS",
        "position": [
          -37.8151038,
          144.96006602
        ]
      },
      {
        "name": "Elizabeth St/Bourke St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.8140574,
          144.96365033
        ]
      },
      {
        "name": "Swanston St/Bourke St #6",
        "locality": "PTV GTFS",
        "position": [
          -37.81324957,
          144.9664442
        ]
      },
      {
        "name": "Russell St/Bourke St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.8124401,
          144.96914719
        ]
      },
      {
        "name": "Spring St/Bourke St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.81152149,
          144.97231882
        ]
      },
      {
        "name": "Albert St/Nicholson St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.80946736,
          144.9728748
        ]
      },
      {
        "name": "Melbourne Museum/Nicholson St #11",
        "locality": "PTV GTFS",
        "position": [
          -37.80570297,
          144.97354565
        ]
      },
      {
        "name": "Brunswick St/Gertrude St #13",
        "locality": "PTV GTFS",
        "position": [
          -37.8056552,
          144.97705664
        ]
      },
      {
        "name": "Napier St/Gertrude St #14",
        "locality": "PTV GTFS",
        "position": [
          -37.80590978,
          144.97928726
        ]
      },
      {
        "name": "Smith St/Gertrude St #15",
        "locality": "PTV GTFS",
        "position": [
          -37.80625603,
          144.98266259
        ]
      },
      {
        "name": "Charles St/Smith St #17",
        "locality": "PTV GTFS",
        "position": [
          -37.80360987,
          144.98338199
        ]
      },
      {
        "name": "Hodgson St/Smith St #18",
        "locality": "PTV GTFS",
        "position": [
          -37.8015794,
          144.98374388
        ]
      },
      {
        "name": "Johnston St/Smith St #19",
        "locality": "PTV GTFS",
        "position": [
          -37.79908131,
          144.98416388
        ]
      },
      {
        "name": "Rose St/Smith St #20",
        "locality": "PTV GTFS",
        "position": [
          -37.79678119,
          144.98456711
        ]
      },
      {
        "name": "Alexandra Pde/Smith St #21",
        "locality": "PTV GTFS",
        "position": [
          -37.79415756,
          144.98502454
        ]
      },
      {
        "name": "Smith St/Queens Pde #22",
        "locality": "PTV GTFS",
        "position": [
          -37.79046738,
          144.98635122
        ]
      },
      {
        "name": "Wellington St/Queens Pde #23",
        "locality": "PTV GTFS",
        "position": [
          -37.78948105,
          144.98875135
        ]
      },
      {
        "name": "Michael St/Queens Pde #24",
        "locality": "PTV GTFS",
        "position": [
          -37.788364,
          144.99141612
        ]
      },
      {
        "name": "Clifton Hill Interchange/Queens Pde #25",
        "locality": "PTV GTFS",
        "position": [
          -37.78565028,
          144.99452142
        ]
      },
      {
        "name": "Walker St/High St #26",
        "locality": "PTV GTFS",
        "position": [
          -37.78356952,
          144.99616734
        ]
      },
      {
        "name": "Westgarth St/High St #27",
        "locality": "PTV GTFS",
        "position": [
          -37.78030919,
          144.99681176
        ]
      },
      {
        "name": "Clarke St/High St #30",
        "locality": "PTV GTFS",
        "position": [
          -37.77665327,
          144.9975122
        ]
      },
      {
        "name": "Northcote Town Hall/High St #31",
        "locality": "PTV GTFS",
        "position": [
          -37.77471223,
          144.99783706
        ]
      },
      {
        "name": "Mitchell St/High St #32",
        "locality": "PTV GTFS",
        "position": [
          -37.77113795,
          144.99856925
        ]
      },
      {
        "name": "Arthurton Rd/High St #33",
        "locality": "PTV GTFS",
        "position": [
          -37.76941329,
          144.99889957
        ]
      },
      {
        "name": "Bent St/High St #34",
        "locality": "PTV GTFS",
        "position": [
          -37.76761424,
          144.99909564
        ]
      },
      {
        "name": "Dennis St/High St #35",
        "locality": "PTV GTFS",
        "position": [
          -37.76573355,
          144.99925986
        ]
      },
      {
        "name": "Darebin Rd/High St #36",
        "locality": "PTV GTFS",
        "position": [
          -37.76332564,
          144.999688
        ]
      },
      {
        "name": "Woolton Ave/High St #37",
        "locality": "PTV GTFS",
        "position": [
          -37.76152929,
          145.00004289
        ]
      },
      {
        "name": "Normanby Ave/High St #38",
        "locality": "PTV GTFS",
        "position": [
          -37.75965052,
          145.00032051
        ]
      },
      {
        "name": "Ballantyne St/High St #39",
        "locality": "PTV GTFS",
        "position": [
          -37.75832064,
          145.00054929
        ]
      },
      {
        "name": "Mansfield St/High St #40",
        "locality": "PTV GTFS",
        "position": [
          -37.7567213,
          145.00083072
        ]
      },
      {
        "name": "Blythe St/High St #41",
        "locality": "PTV GTFS",
        "position": [
          -37.75435803,
          145.00123485
        ]
      },
      {
        "name": "Miller St/High St #42",
        "locality": "PTV GTFS",
        "position": [
          -37.75249881,
          145.00160269
        ]
      },
      {
        "name": "Raglan St/Plenty Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.74918195,
          145.0037008
        ]
      },
      {
        "name": "Seymour St/Plenty Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.74706115,
          145.0051197
        ]
      },
      {
        "name": "Bell St/Plenty Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.74576022,
          145.00599446
        ]
      },
      {
        "name": "David St/Plenty Rd #47",
        "locality": "PTV GTFS",
        "position": [
          -37.74320702,
          145.00795821
        ]
      },
      {
        "name": "Gower St/Plenty Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.74115286,
          145.00959071
        ]
      },
      {
        "name": "Murray Rd/Plenty Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.73889378,
          145.01136477
        ]
      },
      {
        "name": "Sylvester Gr/Plenty Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.73683882,
          145.01241836
        ]
      },
      {
        "name": "Wood St/Plenty Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.73446971,
          145.01354836
        ]
      },
      {
        "name": "Tyler St/Plenty Rd #52",
        "locality": "PTV GTFS",
        "position": [
          -37.73060239,
          145.01508141
        ]
      },
      {
        "name": "Ethel Gr/Plenty Rd #53",
        "locality": "PTV GTFS",
        "position": [
          -37.7291332,
          145.0172084
        ]
      },
      {
        "name": "Wilkinson St/Plenty Rd #54",
        "locality": "PTV GTFS",
        "position": [
          -37.72733292,
          145.02001356
        ]
      },
      {
        "name": "Boldrewood Pde/Plenty Rd #55",
        "locality": "PTV GTFS",
        "position": [
          -37.72543576,
          145.02295731
        ]
      },
      {
        "name": "Loddon Ave/Plenty Rd #56",
        "locality": "PTV GTFS",
        "position": [
          -37.72398574,
          145.02785185
        ]
      },
      {
        "name": "Reservoir District Secondary College/Plenty Rd #57",
        "locality": "PTV GTFS",
        "position": [
          -37.72268897,
          145.0300646
        ]
      },
      {
        "name": "Browning St/Plenty Rd #58",
        "locality": "PTV GTFS",
        "position": [
          -37.72000833,
          145.03684061
        ]
      },
      {
        "name": "Preston Cemetery/Plenty Rd #59",
        "locality": "PTV GTFS",
        "position": [
          -37.71898225,
          145.03962454
        ]
      },
      {
        "name": "La Trobe University/Plenty Rd #60",
        "locality": "PTV GTFS",
        "position": [
          -37.7164471,
          145.04325358
        ]
      },
      {
        "name": "Bundoora Park/Plenty Rd #61",
        "locality": "PTV GTFS",
        "position": [
          -37.71248817,
          145.04635256
        ]
      },
      {
        "name": "Metropolitan Fire Brigade/Plenty Rd #62",
        "locality": "PTV GTFS",
        "position": [
          -37.71053082,
          145.04896765
        ]
      },
      {
        "name": "Greenwood Dr/Plenty Rd #63",
        "locality": "PTV GTFS",
        "position": [
          -37.70738489,
          145.05219224
        ]
      },
      {
        "name": "Mount Cooper Dr/Plenty Rd #64",
        "locality": "PTV GTFS",
        "position": [
          -37.70367113,
          145.0559645
        ]
      },
      {
        "name": "Grimshaw St/Plenty Rd #65",
        "locality": "PTV GTFS",
        "position": [
          -37.70012083,
          145.05817824
        ]
      },
      {
        "name": "Settlement Rd/Plenty Rd #66",
        "locality": "PTV GTFS",
        "position": [
          -37.69795994,
          145.05884708
        ]
      },
      {
        "name": "Bundoora Square SC/Plenty Rd #67",
        "locality": "PTV GTFS",
        "position": [
          -37.69567387,
          145.05957585
        ]
      },
      {
        "name": "Greenhills Rd/Plenty Rd #68",
        "locality": "PTV GTFS",
        "position": [
          -37.69168605,
          145.06313878
        ]
      },
      {
        "name": "Taunton Dr/Plenty Rd #69",
        "locality": "PTV GTFS",
        "position": [
          -37.68802185,
          145.0666589
        ]
      },
      {
        "name": "Clements Dr/Plenty Rd #70",
        "locality": "PTV GTFS",
        "position": [
          -37.68135557,
          145.06902047
        ]
      },
      {
        "name": "RMIT/Plenty Rd #71",
        "locality": "PTV GTFS",
        "position": [
          -37.67898426,
          145.0695015
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "RMIT/Plenty Rd #71",
        "locality": "PTV GTFS",
        "position": [
          -37.67966833,
          145.06944975
        ]
      },
      {
        "name": "Janefield Dr/Plenty Rd #70",
        "locality": "PTV GTFS",
        "position": [
          -37.68231834,
          145.06892747
        ]
      },
      {
        "name": "Taunton Dr/Plenty Rd #69",
        "locality": "PTV GTFS",
        "position": [
          -37.68815734,
          145.06667806
        ]
      },
      {
        "name": "Greenhills Rd/Plenty Rd #68",
        "locality": "PTV GTFS",
        "position": [
          -37.69192741,
          145.06301909
        ]
      },
      {
        "name": "Bundoora Square SC/Plenty Rd #67",
        "locality": "PTV GTFS",
        "position": [
          -37.69590827,
          145.05958108
        ]
      },
      {
        "name": "Settlement Rd/Plenty Rd #66",
        "locality": "PTV GTFS",
        "position": [
          -37.69826584,
          145.05881642
        ]
      },
      {
        "name": "Grimshaw St/Plenty Rd #65",
        "locality": "PTV GTFS",
        "position": [
          -37.69981716,
          145.05834495
        ]
      },
      {
        "name": "Mount Cooper Dr/Plenty Rd #64",
        "locality": "PTV GTFS",
        "position": [
          -37.70390366,
          145.05585634
        ]
      },
      {
        "name": "Greenwood Dr/Plenty Rd #63",
        "locality": "PTV GTFS",
        "position": [
          -37.70806952,
          145.05162983
        ]
      },
      {
        "name": "Metropolitan Fire Brigade/Plenty Rd #62",
        "locality": "PTV GTFS",
        "position": [
          -37.71055109,
          145.04910324
        ]
      },
      {
        "name": "Bundoora Park/Plenty Rd #61",
        "locality": "PTV GTFS",
        "position": [
          -37.71315193,
          145.04562044
        ]
      },
      {
        "name": "La Trobe University/Plenty Rd #60",
        "locality": "PTV GTFS",
        "position": [
          -37.71736721,
          145.04276423
        ]
      },
      {
        "name": "Preston Cemetery/Plenty Rd #59",
        "locality": "PTV GTFS",
        "position": [
          -37.71903856,
          145.03975919
        ]
      },
      {
        "name": "Browning St/Plenty Rd #58",
        "locality": "PTV GTFS",
        "position": [
          -37.72006446,
          145.03696392
        ]
      },
      {
        "name": "Reservoir District Secondary College/Plenty Rd #57",
        "locality": "PTV GTFS",
        "position": [
          -37.7226391,
          145.03031552
        ]
      },
      {
        "name": "Loddon Ave/Plenty Rd #56",
        "locality": "PTV GTFS",
        "position": [
          -37.72452174,
          145.02703208
        ]
      },
      {
        "name": "Albert St/Plenty Rd #55",
        "locality": "PTV GTFS",
        "position": [
          -37.7255684,
          145.02280629
        ]
      },
      {
        "name": "Wilkinson St/Plenty Rd #54",
        "locality": "PTV GTFS",
        "position": [
          -37.72770572,
          145.01967459
        ]
      },
      {
        "name": "Ethel Gr/Plenty Rd #53",
        "locality": "PTV GTFS",
        "position": [
          -37.72912034,
          145.0175151
        ]
      },
      {
        "name": "Tyler St/Plenty Rd #52",
        "locality": "PTV GTFS",
        "position": [
          -37.73099358,
          145.0147646
        ]
      },
      {
        "name": "Wood St/Plenty Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.73432117,
          145.01382467
        ]
      },
      {
        "name": "Sylvester Gr/Plenty Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.73686833,
          145.01256509
        ]
      },
      {
        "name": "Murray Rd/Plenty Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.73870979,
          145.01167609
        ]
      },
      {
        "name": "Gower St/Plenty Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.74077376,
          145.01008884
        ]
      },
      {
        "name": "David St/Plenty Rd #47",
        "locality": "PTV GTFS",
        "position": [
          -37.74288179,
          145.00844358
        ]
      },
      {
        "name": "Bell St/Plenty Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.74533668,
          145.00652788
        ]
      },
      {
        "name": "Osborne Gr/Plenty Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.74687698,
          145.00541972
        ]
      },
      {
        "name": "Raglan St/Plenty Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.74888222,
          145.00409473
        ]
      },
      {
        "name": "Dundas St/Plenty Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.7519829,
          145.00200247
        ]
      },
      {
        "name": "Collins St/High St #41",
        "locality": "PTV GTFS",
        "position": [
          -37.75454951,
          145.0013659
        ]
      },
      {
        "name": "Mansfield St/High St #40",
        "locality": "PTV GTFS",
        "position": [
          -37.75669794,
          145.00104701
        ]
      },
      {
        "name": "Gooch St/High St #39",
        "locality": "PTV GTFS",
        "position": [
          -37.75835995,
          145.0007412
        ]
      },
      {
        "name": "Clarendon St/High St #38",
        "locality": "PTV GTFS",
        "position": [
          -37.75944719,
          145.00055301
        ]
      },
      {
        "name": "Woolton Ave/High St #37",
        "locality": "PTV GTFS",
        "position": [
          -37.7612355,
          145.00025513
        ]
      },
      {
        "name": "Darebin Rd/High St #36",
        "locality": "PTV GTFS",
        "position": [
          -37.76314992,
          144.99995383
        ]
      },
      {
        "name": "Dennis St/High St #35",
        "locality": "PTV GTFS",
        "position": [
          -37.76555783,
          144.99952569
        ]
      },
      {
        "name": "McCutcheon St/High St #34",
        "locality": "PTV GTFS",
        "position": [
          -37.7674732,
          144.99928108
        ]
      },
      {
        "name": "Separation St/High St #33",
        "locality": "PTV GTFS",
        "position": [
          -37.76919272,
          144.99917797
        ]
      },
      {
        "name": "Mitchell St/High St #32",
        "locality": "PTV GTFS",
        "position": [
          -37.77139191,
          144.99866457
        ]
      },
      {
        "name": "Northcote Town Hall/High St #31",
        "locality": "PTV GTFS",
        "position": [
          -37.77500202,
          144.99792007
        ]
      },
      {
        "name": "Clarke St/High St #30",
        "locality": "PTV GTFS",
        "position": [
          -37.77716575,
          144.9974416
        ]
      },
      {
        "name": "Westgarth St/High St #27",
        "locality": "PTV GTFS",
        "position": [
          -37.78087551,
          144.99672834
        ]
      },
      {
        "name": "Walker St/High St #26",
        "locality": "PTV GTFS",
        "position": [
          -37.78389419,
          144.99618129
        ]
      },
      {
        "name": "Clifton Hill Interchange/Queens Pde #25",
        "locality": "PTV GTFS",
        "position": [
          -37.78631716,
          144.99399241
        ]
      },
      {
        "name": "Gold St/Queens Pde #24",
        "locality": "PTV GTFS",
        "position": [
          -37.78893914,
          144.99026498
        ]
      },
      {
        "name": "Wellington St/Queens Pde #23",
        "locality": "PTV GTFS",
        "position": [
          -37.78973549,
          144.98834699
        ]
      },
      {
        "name": "Smith St/Queens Pde #22",
        "locality": "PTV GTFS",
        "position": [
          -37.7906362,
          144.98621037
        ]
      },
      {
        "name": "Alexandra Pde/Smith St #21",
        "locality": "PTV GTFS",
        "position": [
          -37.79362118,
          144.98527759
        ]
      },
      {
        "name": "Keele St/Smith St #20",
        "locality": "PTV GTFS",
        "position": [
          -37.79669422,
          144.98475119
        ]
      },
      {
        "name": "Johnston St/Smith St #19",
        "locality": "PTV GTFS",
        "position": [
          -37.7988416,
          144.98437483
        ]
      },
      {
        "name": "Hodgson St/Smith St #18",
        "locality": "PTV GTFS",
        "position": [
          -37.80139393,
          144.98396471
        ]
      },
      {
        "name": "Charles St/Smith St #17",
        "locality": "PTV GTFS",
        "position": [
          -37.80346063,
          144.98361321
        ]
      },
      {
        "name": "Peel St/Smith St #16",
        "locality": "PTV GTFS",
        "position": [
          -37.80486193,
          144.98334793
        ]
      },
      {
        "name": "Gertrude St/Smith St #15",
        "locality": "PTV GTFS",
        "position": [
          -37.8062364,
          144.98309473
        ]
      },
      {
        "name": "Napier St/Gertrude St #14",
        "locality": "PTV GTFS",
        "position": [
          -37.80608988,
          144.97980483
        ]
      },
      {
        "name": "Brunswick St/Gertrude St #13",
        "locality": "PTV GTFS",
        "position": [
          -37.80582299,
          144.97738144
        ]
      },
      {
        "name": "Melbourne Museum/Nicholson St #11",
        "locality": "PTV GTFS",
        "position": [
          -37.80617097,
          144.97351014
        ]
      },
      {
        "name": "Albert St/Nicholson St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.8096665,
          144.97292615
        ]
      },
      {
        "name": "Spring St/Bourke St #9",
        "locality": "PTV GTFS",
        "position": [
          -37.81151658,
          144.97255749
        ]
      },
      {
        "name": "Russell St/Bourke St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.81270797,
          144.96848101
        ]
      },
      {
        "name": "Swanston St/Bourke St #6",
        "locality": "PTV GTFS",
        "position": [
          -37.8135,
          144.96581257
        ]
      },
      {
        "name": "Elizabeth St/Bourke St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81420601,
          144.96338498
        ]
      },
      {
        "name": "Queen St/Bourke St #4",
        "locality": "PTV GTFS",
        "position": [
          -37.81523478,
          144.95982386
        ]
      },
      {
        "name": "William St/Bourke St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81586374,
          144.95763684
        ]
      },
      {
        "name": "Spencer St/Bourke St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81696847,
          144.95378947
        ]
      },
      {
        "name": "Lonsdale St/Spencer St #120",
        "locality": "PTV GTFS",
        "position": [
          -37.81531286,
          144.95238116
        ]
      },
      {
        "name": "La Trobe St/Spencer St #119",
        "locality": "PTV GTFS",
        "position": [
          -37.81340511,
          144.95150241
        ]
      },
      {
        "name": "Docklands Stadium/La Trobe St  #D1",
        "locality": "PTV GTFS",
        "position": [
          -37.81456566,
          144.94673342
        ]
      },
      {
        "name": "Central Pier/Harbour Esp #D2",
        "locality": "PTV GTFS",
        "position": [
          -37.8142488,
          144.9445839
        ]
      },
      {
        "name": "New Quay Prom/Docklands Dr #D10",
        "locality": "PTV GTFS",
        "position": [
          -37.81378105,
          144.94050751
        ]
      },
      {
        "name": "Waterfront City/Docklands Dr #D11",
        "locality": "PTV GTFS",
        "position": [
          -37.81455555,
          144.93841856
        ]
      }
    ]
  },
  {
    "routeLabel": "109",
    "longName": "Port Melbourne - Box Hill",
    "color": "E87722",
    "forwardDestination": "Box Hill",
    "reverseDestination": "Port Melbourne",
    "forwardStops": [
      {
        "name": "Beacon Cove/Light Rail #129",
        "locality": "PTV GTFS",
        "position": [
          -37.84078946,
          144.93281332
        ]
      },
      {
        "name": "Graham St/Light Rail #128",
        "locality": "PTV GTFS",
        "position": [
          -37.83705429,
          144.93719006
        ]
      },
      {
        "name": "North Port Station/Light Rail #127",
        "locality": "PTV GTFS",
        "position": [
          -37.83320837,
          144.94348967
        ]
      },
      {
        "name": "Montague St/Light Rail #126",
        "locality": "PTV GTFS",
        "position": [
          -37.83024028,
          144.94846907
        ]
      },
      {
        "name": "Southbank Tram Depot/Light Rail #125A",
        "locality": "PTV GTFS",
        "position": [
          -37.82745257,
          144.95398843
        ]
      },
      {
        "name": "Clarendon St/Whiteman St #125",
        "locality": "PTV GTFS",
        "position": [
          -37.82587949,
          144.95629277
        ]
      },
      {
        "name": "Casino/MCEC/Clarendon St #124A",
        "locality": "PTV GTFS",
        "position": [
          -37.82348898,
          144.95615422
        ]
      },
      {
        "name": "Batman Park/Spencer St #124",
        "locality": "PTV GTFS",
        "position": [
          -37.82155404,
          144.95526467
        ]
      },
      {
        "name": "Spencer St/Collins St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81870592,
          144.95524103
        ]
      },
      {
        "name": "William St/Collins St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81739736,
          144.95980976
        ]
      },
      {
        "name": "Elizabeth St/Collins St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81624916,
          144.9637605
        ]
      },
      {
        "name": "Melbourne Town Hall/Collins St #6",
        "locality": "PTV GTFS",
        "position": [
          -37.81551769,
          144.96627972
        ]
      },
      {
        "name": "Exhibition St/Collins St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.81422456,
          144.97072269
        ]
      },
      {
        "name": "Spring St/Collins St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.81341597,
          144.97348244
        ]
      },
      {
        "name": "Parliament Railway Station/Macarthur St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.81217073,
          144.97443658
        ]
      },
      {
        "name": "Albert St/Gisborne St #11",
        "locality": "PTV GTFS",
        "position": [
          -37.80969458,
          144.97560605
        ]
      },
      {
        "name": "St Vincents Plaza/Victoria Pde #12",
        "locality": "PTV GTFS",
        "position": [
          -37.80821104,
          144.97632809
        ]
      },
      {
        "name": "Lansdowne St/Victoria Pde #13",
        "locality": "PTV GTFS",
        "position": [
          -37.80843491,
          144.97834381
        ]
      },
      {
        "name": "Smith St/Victoria Pde #15",
        "locality": "PTV GTFS",
        "position": [
          -37.80890835,
          144.98282893
        ]
      },
      {
        "name": "Wellington St/Victoria Pde #16",
        "locality": "PTV GTFS",
        "position": [
          -37.80923318,
          144.9860119
        ]
      },
      {
        "name": "Hoddle St/Victoria Pde #18",
        "locality": "PTV GTFS",
        "position": [
          -37.80972686,
          144.99064424
        ]
      },
      {
        "name": "North Richmond Railway Station/Victoria St #19",
        "locality": "PTV GTFS",
        "position": [
          -37.80970922,
          144.99278018
        ]
      },
      {
        "name": "Lennox St/Victoria St #20",
        "locality": "PTV GTFS",
        "position": [
          -37.80999428,
          144.99575984
        ]
      },
      {
        "name": "Church St/Victoria St #21",
        "locality": "PTV GTFS",
        "position": [
          -37.8104897,
          145.00051721
        ]
      },
      {
        "name": "McKay St/Victoria St #22",
        "locality": "PTV GTFS",
        "position": [
          -37.81082884,
          145.00404071
        ]
      },
      {
        "name": "Flockhart St/Victoria St #23",
        "locality": "PTV GTFS",
        "position": [
          -37.81111112,
          145.00687288
        ]
      },
      {
        "name": "Burnley St/Victoria St #24",
        "locality": "PTV GTFS",
        "position": [
          -37.81143934,
          145.01029451
        ]
      },
      {
        "name": "River Bvd/Victoria St #25",
        "locality": "PTV GTFS",
        "position": [
          -37.81176747,
          145.01318229
        ]
      },
      {
        "name": "Findon Cres/Barkers Rd #27",
        "locality": "PTV GTFS",
        "position": [
          -37.81271281,
          145.02062002
        ]
      },
      {
        "name": "High St/Barkers Rd #29",
        "locality": "PTV GTFS",
        "position": [
          -37.81302615,
          145.02317888
        ]
      },
      {
        "name": "Stevenson St/High St #31",
        "locality": "PTV GTFS",
        "position": [
          -37.81022844,
          145.02616139
        ]
      },
      {
        "name": "Kew Junction/High St #32",
        "locality": "PTV GTFS",
        "position": [
          -37.80759248,
          145.02858281
        ]
      },
      {
        "name": "Kew Shopping Centre/High St #33",
        "locality": "PTV GTFS",
        "position": [
          -37.80681369,
          145.03051174
        ]
      },
      {
        "name": "QPO/Cotham Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.80688691,
          145.031657
        ]
      },
      {
        "name": "Charles St/Cotham Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.80730828,
          145.03530325
        ]
      },
      {
        "name": "Glenferrie Rd/Cotham Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.80762205,
          145.03790741
        ]
      },
      {
        "name": "Belmont Ave/Cotham Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.80811893,
          145.04231278
        ]
      },
      {
        "name": "Marshall Ave/Cotham Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.80852889,
          145.04583452
        ]
      },
      {
        "name": "Florence Ave/Cotham Rd #39",
        "locality": "PTV GTFS",
        "position": [
          -37.80893742,
          145.04927682
        ]
      },
      {
        "name": "St George's Hospital/Cotham Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.80937608,
          145.05291148
        ]
      },
      {
        "name": "Kew Traffic School/Cotham Rd #41",
        "locality": "PTV GTFS",
        "position": [
          -37.80993225,
          145.05766764
        ]
      },
      {
        "name": "Burke Rd/Cotham Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.8102763,
          145.06049838
        ]
      },
      {
        "name": "Deepdene Shopping Centre/Whitehorse Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.81078738,
          145.06472195
        ]
      },
      {
        "name": "Deepdene Park/Whitehorse Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.81123736,
          145.06852689
        ]
      },
      {
        "name": "Hardwicke St/Whitehorse Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.81159053,
          145.07138022
        ]
      },
      {
        "name": "Balwyn Cinema/Whitehorse Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.81211319,
          145.0757854
        ]
      },
      {
        "name": "Balwyn Rd/Whitehorse Rd #47",
        "locality": "PTV GTFS",
        "position": [
          -37.81276908,
          145.08118682
        ]
      },
      {
        "name": "Balwyn Shopping Centre/Whitehorse Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.81306107,
          145.08362156
        ]
      },
      {
        "name": "Northcote Ave/Whitehorse Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.81355182,
          145.08775511
        ]
      },
      {
        "name": "Wharton St/Whitehorse Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.81403012,
          145.09168457
        ]
      },
      {
        "name": "Narrak Rd/Whitehorse Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.81440479,
          145.09478749
        ]
      },
      {
        "name": "Union Rd/Whitehorse Rd #53",
        "locality": "PTV GTFS",
        "position": [
          -37.81494552,
          145.09924935
        ]
      },
      {
        "name": "Inglisby Rd/Whitehorse Rd #54",
        "locality": "PTV GTFS",
        "position": [
          -37.81540286,
          145.10302046
        ]
      },
      {
        "name": "Hood St/Whitehorse Rd #55",
        "locality": "PTV GTFS",
        "position": [
          -37.81616255,
          145.10935126
        ]
      },
      {
        "name": "Elgar Rd/Whitehorse Rd #56",
        "locality": "PTV GTFS",
        "position": [
          -37.81691144,
          145.11559159
        ]
      },
      {
        "name": "Nelson Rd/Whitehorse Rd #57",
        "locality": "PTV GTFS",
        "position": [
          -37.81746614,
          145.11984893
        ]
      },
      {
        "name": "Box Hill Central/Whitehorse Rd #58",
        "locality": "PTV GTFS",
        "position": [
          -37.81784379,
          145.1220546
        ]
      }
    ],
    "reverseStops": [
      {
        "name": "Box Hill Central/Whitehorse Rd #58",
        "locality": "PTV GTFS",
        "position": [
          -37.81784397,
          145.12206596
        ]
      },
      {
        "name": "Nelson Rd/Whitehorse Rd #57",
        "locality": "PTV GTFS",
        "position": [
          -37.81737521,
          145.11866977
        ]
      },
      {
        "name": "Elgar Rd/Whitehorse Rd #56",
        "locality": "PTV GTFS",
        "position": [
          -37.81683885,
          145.1144347
        ]
      },
      {
        "name": "Hood St/Whitehorse Rd #55",
        "locality": "PTV GTFS",
        "position": [
          -37.81629705,
          145.10987039
        ]
      },
      {
        "name": "Inglisby Rd/Whitehorse Rd #54",
        "locality": "PTV GTFS",
        "position": [
          -37.81546262,
          145.10281445
        ]
      },
      {
        "name": "Union Rd/Whitehorse Rd #53",
        "locality": "PTV GTFS",
        "position": [
          -37.81511207,
          145.09951771
        ]
      },
      {
        "name": "Narrak Rd/Whitehorse Rd #51",
        "locality": "PTV GTFS",
        "position": [
          -37.81456418,
          145.09516962
        ]
      },
      {
        "name": "Wharton St/Whitehorse Rd #50",
        "locality": "PTV GTFS",
        "position": [
          -37.81410622,
          145.0913759
        ]
      },
      {
        "name": "Northcote Ave/Whitehorse Rd #49",
        "locality": "PTV GTFS",
        "position": [
          -37.81369027,
          145.08795601
        ]
      },
      {
        "name": "Balwyn Shopping Centre/Whitehorse Rd #48",
        "locality": "PTV GTFS",
        "position": [
          -37.81319896,
          145.08378838
        ]
      },
      {
        "name": "Balwyn Rd/Whitehorse Rd #47",
        "locality": "PTV GTFS",
        "position": [
          -37.81291876,
          145.08152373
        ]
      },
      {
        "name": "Balwyn Cinema/Whitehorse Rd #46",
        "locality": "PTV GTFS",
        "position": [
          -37.81224172,
          145.07592973
        ]
      },
      {
        "name": "Hardwicke St/Whitehorse Rd #45",
        "locality": "PTV GTFS",
        "position": [
          -37.81175036,
          145.07178499
        ]
      },
      {
        "name": "Deepdene Park/Whitehorse Rd #44",
        "locality": "PTV GTFS",
        "position": [
          -37.8113749,
          145.06867098
        ]
      },
      {
        "name": "Deepdene Shopping Centre/Whitehorse Rd #43",
        "locality": "PTV GTFS",
        "position": [
          -37.81092511,
          145.06487739
        ]
      },
      {
        "name": "Burke Rd/Whitehorse Rd #42",
        "locality": "PTV GTFS",
        "position": [
          -37.81044443,
          145.06085747
        ]
      },
      {
        "name": "Kew Traffic School/Cotham Rd #41",
        "locality": "PTV GTFS",
        "position": [
          -37.81009796,
          145.05787912
        ]
      },
      {
        "name": "St George's Hospital/Cotham Rd #40",
        "locality": "PTV GTFS",
        "position": [
          -37.80952265,
          145.0530553
        ]
      },
      {
        "name": "Thomas St/Cotham Rd #39",
        "locality": "PTV GTFS",
        "position": [
          -37.80911647,
          145.04974918
        ]
      },
      {
        "name": "Marshall Ave/Cotham Rd #38",
        "locality": "PTV GTFS",
        "position": [
          -37.80870569,
          145.04617062
        ]
      },
      {
        "name": "Belmont Ave/Cotham Rd #37",
        "locality": "PTV GTFS",
        "position": [
          -37.80831583,
          145.04277329
        ]
      },
      {
        "name": "Glenferrie Rd/Cotham Rd #36",
        "locality": "PTV GTFS",
        "position": [
          -37.80779906,
          145.03825484
        ]
      },
      {
        "name": "Charles St/Cotham Rd #35",
        "locality": "PTV GTFS",
        "position": [
          -37.80747458,
          145.03554873
        ]
      },
      {
        "name": "High St/Cotham Rd #34",
        "locality": "PTV GTFS",
        "position": [
          -37.80698912,
          145.03130217
        ]
      },
      {
        "name": "Kew Junction/High St #32",
        "locality": "PTV GTFS",
        "position": [
          -37.80743064,
          145.02914368
        ]
      },
      {
        "name": "Stevenson St/High St #31",
        "locality": "PTV GTFS",
        "position": [
          -37.81008101,
          145.02650609
        ]
      },
      {
        "name": "Barkers Rd/High St #29",
        "locality": "PTV GTFS",
        "position": [
          -37.812964,
          145.02377122
        ]
      },
      {
        "name": "Findon St/Barkers Rd #27",
        "locality": "PTV GTFS",
        "position": [
          -37.81287762,
          145.02077465
        ]
      },
      {
        "name": "River Bvd/Victoria St #25",
        "locality": "PTV GTFS",
        "position": [
          -37.81180944,
          145.01299941
        ]
      },
      {
        "name": "Burnley St/Victoria St #24",
        "locality": "PTV GTFS",
        "position": [
          -37.8114909,
          145.01014545
        ]
      },
      {
        "name": "Leslie St/Victoria St #23",
        "locality": "PTV GTFS",
        "position": [
          -37.81131297,
          145.00761715
        ]
      },
      {
        "name": "McKay St/Victoria St #22",
        "locality": "PTV GTFS",
        "position": [
          -37.81097624,
          145.00422985
        ]
      },
      {
        "name": "Church St/Victoria St #21",
        "locality": "PTV GTFS",
        "position": [
          -37.81061374,
          145.00092279
        ]
      },
      {
        "name": "Lennox St/Victoria St #20",
        "locality": "PTV GTFS",
        "position": [
          -37.81013809,
          144.99626711
        ]
      },
      {
        "name": "North Richmond Railway Station/Victoria St #19",
        "locality": "PTV GTFS",
        "position": [
          -37.80976307,
          144.99276736
        ]
      },
      {
        "name": "Hoddle St/Victoria Pde #18",
        "locality": "PTV GTFS",
        "position": [
          -37.80975766,
          144.99033672
        ]
      },
      {
        "name": "Wellington St/Victoria Pde #16",
        "locality": "PTV GTFS",
        "position": [
          -37.80928509,
          144.98588554
        ]
      },
      {
        "name": "Smith St/Victoria Pde #15",
        "locality": "PTV GTFS",
        "position": [
          -37.80889629,
          144.98212502
        ]
      },
      {
        "name": "Lansdowne St/Victoria Pde #13",
        "locality": "PTV GTFS",
        "position": [
          -37.80854257,
          144.97884065
        ]
      },
      {
        "name": "St Vincents Plaza/Victoria Pde #12",
        "locality": "PTV GTFS",
        "position": [
          -37.8082739,
          144.97631501
        ]
      },
      {
        "name": "Albert St/Gisborne St #11",
        "locality": "PTV GTFS",
        "position": [
          -37.80939028,
          144.97572795
        ]
      },
      {
        "name": "Parliament Railway Station/Macarthur St #10",
        "locality": "PTV GTFS",
        "position": [
          -37.8124486,
          144.97434947
        ]
      },
      {
        "name": "Spring St/Collins St #8",
        "locality": "PTV GTFS",
        "position": [
          -37.81353855,
          144.97327462
        ]
      },
      {
        "name": "Exhibition St/Collins St #7",
        "locality": "PTV GTFS",
        "position": [
          -37.81435556,
          144.97048055
        ]
      },
      {
        "name": "Melbourne Town Hall/Collins St #6",
        "locality": "PTV GTFS",
        "position": [
          -37.81568334,
          144.96595711
        ]
      },
      {
        "name": "Elizabeth St/Collins St #5",
        "locality": "PTV GTFS",
        "position": [
          -37.81639699,
          144.96344972
        ]
      },
      {
        "name": "William St/Collins St #3",
        "locality": "PTV GTFS",
        "position": [
          -37.81756122,
          144.95938493
        ]
      },
      {
        "name": "Spencer St/Collins St #1",
        "locality": "PTV GTFS",
        "position": [
          -37.81884589,
          144.95499861
        ]
      },
      {
        "name": "Batman Park/Spencer St #124",
        "locality": "PTV GTFS",
        "position": [
          -37.82199993,
          144.95551366
        ]
      },
      {
        "name": "Casino/MCEC/Clarendon St #124A",
        "locality": "PTV GTFS",
        "position": [
          -37.82345413,
          144.95622335
        ]
      },
      {
        "name": "Port Junction/Whiteman St #125",
        "locality": "PTV GTFS",
        "position": [
          -37.82592571,
          144.95635966
        ]
      },
      {
        "name": "Southbank Tram Depot/Light Rail #125A",
        "locality": "PTV GTFS",
        "position": [
          -37.82767302,
          144.95370966
        ]
      },
      {
        "name": "Montague St/Light Rail #126",
        "locality": "PTV GTFS",
        "position": [
          -37.83019138,
          144.94876583
        ]
      },
      {
        "name": "North Port Station/Light Rail #127",
        "locality": "PTV GTFS",
        "position": [
          -37.83343097,
          144.94333578
        ]
      },
      {
        "name": "Graham St/Light Rail #128",
        "locality": "PTV GTFS",
        "position": [
          -37.83703204,
          144.93746339
        ]
      },
      {
        "name": "Beacon Cove/Light Rail #129",
        "locality": "PTV GTFS",
        "position": [
          -37.84078946,
          144.93281332
        ]
      }
    ]
  }
];
