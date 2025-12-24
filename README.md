# Share of Search Analytics Tool

A powerful competitive intelligence tool that calculates Share of Search (SoS), Share of Voice (SoV), identifies keyword gaps, and provides AI-powered SEO recommendations.

## Features

- **Share of Search Analysis**: Calculate your brand's search visibility vs competitors
- **Share of Voice Metrics**: Visibility-weighted analysis based on SERP positions
- **Gap Analysis**: Identify keywords where competitors outrank you
- **AI Recommendations**: Actionable insights prioritized by impact
- **Export Reports**: Download analysis as Markdown

## Quick Start

1. Open `index.html` in your browser
2. Enter your brand name and domain
3. Add 1-5 competitors
4. Click "Analyze Share of Search"

The tool runs in **Demo Mode** by default with realistic simulated data.

## Live Data Mode

To use real data from DataForSEO:

1. Get API credentials from [DataForSEO](https://dataforseo.com/)
2. Expand "API Configuration" in the form
3. Enter your API login and password
4. Run analysis to fetch live SERP data

## Tech Stack

- **HTML5** - Semantic structure
- **CSS3** - Custom properties, glassmorphism, responsive design
- **JavaScript (ES6+)** - Vanilla JS, no framework dependencies
- **Chart.js** - Data visualizations

## Files

```
glowing-rosette/
├── index.html    # Main HTML structure
├── styles.css    # Design system & styles
├── app.js        # Application logic
└── README.md     # This file
```

## Calculations

### Share of Search
```
SoS = (Brand Visibility Score) / (Total Market Visibility) × 100
```

### Share of Voice
```
SoV = Σ(Keyword Volume × Position Weight) / Σ(Total Volume × Max Weight) × 100
```

Position weights: #1 = 100%, #2 = 85%, #3 = 72%, ..., #10 = 15%

## License

MIT License
