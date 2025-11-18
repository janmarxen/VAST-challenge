# Brainstorming Visualizations and Tech Stack for VAST Challenge 3: Economics

## Project Context Overview

The challenge focuses on three key questions about the fictional city of Engagement, Ohio:

1. **Business prosperity**: Which businesses are thriving or struggling over time (limit: 10 images, 500 words)
2. **Resident financial health**: How wages compare to cost of living, identifying similar patterns across groups (limit: 10 images, 500 words) 
3. **Employer health**: Employment patterns and turnover analysis (limit: 10 images, 500 words)

The dataset contains **~120 million data points** across 15 months with 5-minute increments.

### Detailed Challenge Questions

**Question 1: Business Prosperity**
> Over the period covered by the dataset, which businesses appear to be more prosperous? Which appear to be struggling? Describe your rationale for your answers.
> 
> **Limit**: 10 images and 500 words.

**Question 2: Resident Financial Health**
> How does the financial health of the residents change over the period covered by the dataset? How do wages compare to the overall cost of living in Engagement? Are there groups that appear to exhibit similar patterns? Describe your rationale for your answers.
> 
> **Limit**: 10 images and 500 words.

**Question 3: Employer Health & Turnover**
> Describe the health of the various employers within the city limits. What employment patterns do you observe? Do you notice any areas of particularly high or low turnover?
> 
> **Limit**: 10 images and 500 words.

---

## 1. Visualization Strategy & Data Transformation Ideas

### Question 1: Business Prosperity Analysis

**Data Sources**:[2]
- `FinancialJournal.csv` (category: "Wage" transactions by employer)
- `Employers.csv` + `Jobs.csv` (employer metadata, wage rates)
- `ParticipantStatusLogs` (tracking employment over time via `jobId`)
- `CheckinJournal.csv` (employee presence at workplaces)

**Visualization Ideas** (applying course concepts):

**A. Temporal Line Chart with Small Multiples**[3][4]
- **Concept**: Temporal Visualization - Line charts for time series
- **Implementation**: Create small multiples showing revenue trends for each employer category
- **Data transformation**: 
  - Aggregate wage payments by employer per month
  - Calculate total revenue as sum of wages paid (proxy for business activity)
  - Group by employer type if metadata available
- **Interaction**: Brushing and linking - selecting a time period highlights corresponding businesses

**B. Horizon Graph for Comparative Business Performance**
- **Concept**: Compact temporal visualization for multiple variables
- **Implementation**: Show normalized revenue growth for all businesses simultaneously
- **Data transformation**:
  - Calculate month-over-month revenue change per employer
  - Normalize to baseline (first month = 0)
  - Apply horizon graph layering technique

**C. Stream Graph / Alluvial Diagram**
- **Concept**: Temporal flow visualization
- **Implementation**: Show market share changes among employers over time
- **Data transformation**:
  - Calculate employer revenue as % of total city revenue per month
  - Identify employer categories/industries
  - Track flow of market dominance

**D. Scatter Plot Matrix with Temporal Encoding**
- **Concept**: Multidimensional visualization
- **Implementation**: Compare businesses on multiple metrics (employees, avg wage, revenue, stability)
- **Data transformation**:
  - Calculate for each employer: employee count, average hourly rate, total wage expenditure, employee retention rate
  - Color encode by time period (early/mid/late dataset)
  - Size by total revenue

**E. Geographic Heat Map with Temporal Animation**
- **Concept**: Spatial + temporal visualization
- **Implementation**: Show business activity by geographic location over time
- **Data transformation**:
  - Aggregate transactions by building location
  - Calculate business density and average wages per region
  - Create monthly snapshots for animation

### Question 2: Resident Financial Health & Cost of Living

**Data Sources**:
- `ParticipantStatusLogs` (`availableBalance`, `financialStatus`, `dailyFoodBudget`, `weeklyExtraBudget`)
- `FinancialJournal.csv` (all transaction categories)
- `Jobs.csv` (`hourlyRate`)
- `Apartments.csv` (`rentalCost`)
- `Participants.csv` (demographics: `age`, `educationLevel`, `householdSize`, `haveKids`)

**Visualization Ideas**:

**A. Parallel Coordinates Plot (PCP) for Multidimensional Analysis**
- **Concept**: Axis-based technique for high-dimensional data
- **Implementation**: Visualize wages, rent, food costs, balance, and demographics simultaneously
- **Data transformation**:
  - Sample representative participants (1000 participants, monthly snapshots)
  - Axes: hourly wage, monthly income, rent cost, food expenditure, available balance, age, education
  - Apply edge bundling to reduce clutter[4]
  - Color by financial status or demographic group
- **Interaction**: Angular brushing to select population segments

**B. Time Series Line Chart with Confidence Bands**
- **Concept**: Temporal visualization with uncertainty
- **Implementation**: Show median/quartile trajectories of financial health over time
- **Data transformation**:
  - Calculate monthly: median `availableBalance`, P25/P75 percentiles
  - Segment by demographic groups (education, household type)
  - Compute cost-of-living index: (rent + average food cost + average recreation cost) per capita

**C. Stacked Area Chart: Income vs. Expenditure**
- **Concept**: Temporal part-to-whole visualization
- **Implementation**: Show how different expense categories consume income
- **Data transformation**:
  - From `FinancialJournal.csv`, aggregate monthly by category: Shelter, Food, Recreation, Education
  - Calculate total monthly income from Wage transactions
  - Stack expense categories, overlay with income line

**D. Scatter Plot: Wages vs. Cost of Living with Clustering**
- **Concept**: Multidimensional visualization with clustering
- **Implementation**: Plot hourly wage against total living costs, identify similar groups
- **Data transformation**:
  - Calculate per-participant: average hourly wage, total monthly living cost (rent + food + other)
  - Apply k-means or DBSCAN clustering on demographics + financial metrics
  - Color by cluster, size by household size
- **Interaction**: Lasso selection to explore group characteristics[7]

**E. Dimensionality Reduction: t-SNE or UMAP Projection**
- **Concept**: Visualizing high-dimensional data in 2D
- **Implementation**: Project participants into 2D space based on financial + demographic features
- **Data transformation**:
  - Feature vector per participant: age, education, household size, income, expenses, balance trajectory
  - Apply t-SNE/UMAP to reduce to 2D
  - Color by financial health category
  - Reveals natural groupings with similar financial patterns

**F. Small Multiples: Financial Trajectories by Demographic**
- **Concept**: Faceted temporal visualization
- **Implementation**: Grid of line charts showing balance over time, one per demographic segment
- **Data transformation**:
  - Segment by: education level x household type
  - Calculate median balance trajectory per segment
  - Highlight segments with improving/declining trends

### Question 3: Employer Health & Turnover Analysis

**Data Sources**:
- `ParticipantStatusLogs` (tracking `jobId` changes)
- `Jobs.csv` + `Employers.csv`
- `CheckinJournal.csv` (workplace attendance)
- `FinancialJournal.csv` (wage payments)

**Visualization Ideas**:

**A. Sankey/Alluvial Diagram: Job Flow Patterns**
- **Concept**: Flow visualization for categorical temporal data[3]
- **Implementation**: Show employee movements between employers over time
- **Data transformation**:
  - Identify job changes by tracking `jobId` transitions per participant
  - Create employer-to-employer flow matrix per quarter
  - Filter to show major flows (>10 employees)
- **Reveals**: Which employers are gaining/losing employees, circular patterns

**B. Heatmap: Turnover Rate by Employer and Time**
- **Concept**: Matrix visualization with color encoding
- **Implementation**: Rows = employers, Columns = months, Color = turnover rate
- **Data transformation**:
  - Calculate turnover rate: (employees who left in month M) / (employees at start of month M)
  - Aggregate by employer
  - Apply color scale (low=green, high=red)

**C. Geographic Heatmap: Spatial Turnover Patterns**
- **Concept**: Geospatial analysis
- **Implementation**: Map showing turnover rates by building/region
- **Data transformation**:
  - Join `Employers` with `Buildings` via `buildingId`
  - Calculate turnover per building
  - Create spatial bins/hexbins for aggregation
- **Reveals**: Geographic clusters of high/low turnover

**D. Network Visualization: Job Transition Graph**
- **Concept**: Node-link diagram for relationships
- **Implementation**: Nodes = employers, edges = employee transitions (weighted by count)
- **Data transformation**:
  - Build directed graph: edge from Employer A → B if employee moved from A to B
  - Edge weight = number of such transitions
  - Calculate node centrality metrics[8]
- **Interaction**: Force-directed layout, hover for details[8]
- **Reveals**: Central employers (high in/out flow), isolated employers

**E. Treemap: Hierarchical Employer Size**
- **Concept**: Space-filling hierarchical visualization
- **Implementation**: Show employer hierarchy by size and growth
- **Data transformation**:
  - Group employers by industry/region (if metadata exists, else by size)
  - Size rectangles by current employee count
  - Color by growth rate (employees gained/lost)
- **Interaction**: Drill-down to employer details

**F. Line Chart with Dual Axis: Employee Count vs. Avg Wage**
- **Concept**: Temporal correlation analysis
- **Implementation**: Per employer, show employee count and average wage over time
- **Data transformation**:
  - Calculate monthly: unique employees per employer, average hourly rate
  - Detect inverse relationships (wage increase → employee decrease?)
  - Create small multiples for multiple employers

**G. Boxplot/Violin Plot: Turnover Distribution by Industry**
- **Concept**: Statistical distribution visualization
- **Implementation**: Compare turnover rate distributions across employer types
- **Data transformation**:
  - Calculate monthly turnover per employer
  - Group employers by category
  - Create boxplots showing median, quartiles, outliers

## Data Transformation Pipeline

### Important Preprocessing Steps

**1. Temporal Aggregation**
```
From: 5-minute granularity (120M rows)
To: Monthly/weekly aggregates (manageable size)
- Group ParticipantStatusLogs by month, participantId
- Calculate: avg balance, min balance, max balance, balance volatility
```

**2. Financial Metrics Calculation**
```
Cost of Living Index:
- Rent (from Apartments via apartmentId)
- Food costs (sum of Food transactions / days)
- Recreation (sum of Recreation transactions)
- Total = rent + food + recreation per month

Income Metrics:
- From Jobs.csv: hourlyRate × hoursWorked
- Hours worked: from currentMode="AtWork" durations
```

**3. Employment Tracking**
```
Turnover Detection:
- For each participant, track jobId changes
- Flag transitions: (timestamp, participantId, oldJobId, newJobId)
- Calculate retention: days until job change
```

**4. Business Revenue Proxy**
```
Since direct revenue isn't available:
- Sum of wage payments = business wage expenditure
- Count of unique employees = business size
- CheckinJournal frequency = business activity level
```

**5. Clustering for Pattern Detection**
```
Apply clustering algorithms:
- K-means on: [age, education, income, expenses, balance]
- Hierarchical clustering for employers
- Identify 3-5 resident groups with similar financial patterns
```

**6. Missing Data Handling**
```
- ParticipantStatusLogs may have gaps (acknowledged in challenge[18])
- Interpolate or forward-fill for continuous metrics
- Flag anomalous transitions (e.g., sudden large balance changes)
```

## 2. Tech Stack

### Overall Architecture

The frontend and the backend should be dockerized. Each will have API unit tests!

```
┌─────────────────────────────────────────────────┐
│              Frontend (JavaScript)               │
│  - React.js (component structure)                │
│  - D3.js (visualization rendering)               │
│  - Interactive controls, brushing, linking       │
└──────────────────┬──────────────────────────────┘
                   │ REST API / WebSocket
                   │ (JSON data transfer)
┌──────────────────▼──────────────────────────────┐
│              Backend (Python)                    │
│  - Flask (web server, API endpoints)             │
│  - Pandas/NumPy (data transformation)            │
│  - Scikit-learn (clustering, PCA)                │
│  - Data preprocessing and aggregation              │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│          Data Storage & ETL                      │
│  - SQLite/PostgreSQL (processed data)            │
│  - Python ETL scripts (initial processing)       │
│  - CSV exports for frontend (pre-aggregated)     │
└─────────────────────────────────────────────────┘
```

### Backend: Python Stack

**Core Libraries**:

1. **Flask** (Web Framework)
   - Lightweight, perfect for serving APIs to frontend
   - Easy routing for data endpoints
   - Example route structure:
     ```python
     @app.route('/api/business-revenue')
     def get_business_revenue():
         # Query processed data
         # Return JSON
         return jsonify(data)
     ```

2. **Pandas** (Data Processing)
   - ETL transformations: read CSVs, group by, aggregate
   - Time series operations: resampling, rolling windows
   - Merging multiple data sources (joins on IDs)
   - Example:
     ```python
     # Monthly aggregation
     df_monthly = df.groupby([pd.Grouper(key='timestamp', freq='M'), 'employerId'])
                    .agg({'amount': 'sum', 'participantId': 'nunique'})
     ```

3. **NumPy** (Numerical Computing)
   - Fast array operations for calculations
   - Statistical functions (percentiles, correlations)

4. **Scikit-learn** (Clustering & Dimensionality Reduction)
   - K-means clustering for participant segmentation
   - PCA, t-SNE, UMAP for dimensionality reduction
   - Example:
     ```python
     from sklearn.cluster import KMeans
     from sklearn.manifold import TSNE
     
     kmeans = KMeans(n_clusters=5)
     clusters = kmeans.fit_predict(features)
     
     tsne = TSNE(n_components=2)
     embedding = tsne.fit_transform(features)
     ```

5. **SQLAlchemy** (Optional - Database ORM)
   - If using PostgreSQL for better performance
   - Structured queries on processed data

**ETL Pipeline Structure**:

```python
# 1. Extract
def extract_data():
    participants = pd.read_csv('Participants.csv')
    status_logs = pd.read_csv('ParticipantStatusLogs1.csv')  # repeat for all 72 files
    financial = pd.read_csv('FinancialJournal.csv')
    # ... other sources
    return participants, status_logs, financial

# 2. Transform
def transform_data(participants, status_logs, financial):
    # Temporal aggregation
    monthly_status = status_logs.groupby([pd.Grouper(key='timestamp', freq='M'), 
                                          'participantId']).agg({
        'availableBalance': ['mean', 'min', 'max', 'std']
    })
    
    # Calculate cost of living
    cost_of_living = calculate_col(financial, apartments)
    
    # Merge datasets
    merged = participants.merge(monthly_status, on='participantId')
    
    # Clustering
    clusters = perform_clustering(merged[feature_columns])
    merged['cluster'] = clusters
    
    return merged

# 3. Load
def load_data(transformed_data):
    # Option 1: Save to SQLite (better peformance)
    transformed_data.to_sql('participant_monthly', con=db_engine, if_exists='replace')
    
    # Option 2: Export aggregated CSVs for frontend
    transformed_data.to_csv('output/participant_monthly.csv', index=False)
```

**Flask API Design**:

```python
from flask import Flask, jsonify
from flask_cors import CORS  # Enable CORS for frontend requests

app = Flask(__name__)
CORS(app)

# Endpoint: Business revenue time series
@app.route('/api/business-revenue/<int:employer_id>')
def business_revenue(employer_id):
    # Query processed data (from SQLite or CSV)
    df = pd.read_sql(f"SELECT * FROM business_monthly WHERE employerId={employer_id}", con=db)
    return jsonify(df.to_dict(orient='records'))

# Endpoint: Participant clusters
@app.route('/api/participant-clusters')
def participant_clusters():
    df = pd.read_csv('output/participant_clusters.csv')
    return jsonify(df.to_dict(orient='records'))

# Endpoint: Turnover heatmap data
@app.route('/api/turnover-heatmap')
def turnover_heatmap():
    df = pd.read_csv('output/turnover_matrix.csv')
    return jsonify({
        'employers': df['employerId'].tolist(),
        'months': df.columns[1:].tolist(),
        'values': df.iloc[:, 1:].values.tolist()
    })
```

### Frontend: JavaScript Stack

**Core Technologies**:

1. **React.js** (UI Framework)
   - Component-based architecture (matches assignment experience)[1]
   - State management for user interactions
   - Efficient re-rendering with virtual DOM
   - Example component structure:
     ```jsx
     function VisualizationDashboard() {
       const [selectedBusiness, setSelectedBusiness] = useState(null);
       const [timeRange, setTimeRange] = useState([startDate, endDate]);
       
       return (
         <div>
           <TimeRangeSlider value={timeRange} onChange={setTimeRange} />
           <BusinessRevenueChart businessId={selectedBusiness} timeRange={timeRange} />
           <TurnoverHeatmap onSelectBusiness={setSelectedBusiness} />
         </div>
       );
     }
     ```

2. **D3.js v7** (Visualization Library)
   - **Don't use D3 for DOM manipulation with React** - let React handle the DOM[10][18][19]
   - Use D3 for:
     - **Data transformations**: scales, axes, layouts
     - **SVG path generation**: line generators, arc generators
     - **Force simulations**: for network graphs
   - Example integration pattern:
     ```jsx
     function LineChart({ data }) {
       const svgRef = useRef();
       
       useEffect(() => {
         const svg = d3.select(svgRef.current);
         
         // D3 creates scales
         const xScale = d3.scaleTime()
           .domain(d3.extent(data, d => d.date))
           .range([0, width]);
         
         const yScale = d3.scaleLinear()
           .domain([0, d3.max(data, d => d.value)])
           .range([height, 0]);
         
         // D3 generates path
         const line = d3.line()
           .x(d => xScale(d.date))
           .y(d => yScale(d.value));
         
         // React renders, D3 just provides the path data
         svg.select('.line').attr('d', line(data));
       }, [data]);
       
       return (
         <svg ref={svgRef} width={width} height={height}>
           <path className="line" fill="none" stroke="steelblue" />
         </svg>
       );
     }
     ```

3. **Additional Libraries**:
   - **Axios**: HTTP requests to Flask backend
     ```javascript
     import axios from 'axios';
     
     async function fetchBusinessRevenue(businessId) {
       const response = await axios.get(`http://localhost:5000/api/business-revenue/${businessId}`);
       return response.data;
     }
     ```
   
   - **D3-Force**: For network visualization (job transitions)[8]
   - **D3-Sankey**: For alluvial diagrams (job flows)[3]
   - **Leaflet or D3-geo**: For geographic visualizations (if needed)

**Project Structure**:[18][10]
```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── BusinessViews/
│   │   │   ├── RevenueTimeSeries.jsx
│   │   │   ├── BusinessScatterPlot.jsx
│   │   │   └── MarketShareStream.jsx
│   │   ├── ResidentViews/
│   │   │   ├── ParallelCoordinates.jsx
│   │   │   ├── WageVsCostScatter.jsx
│   │   │   └── FinancialHealthTimeSeries.jsx
│   │   ├── EmployerViews/
│   │   │   ├── TurnoverHeatmap.jsx
│   │   │   ├── JobFlowSankey.jsx
│   │   │   └── TransitionNetwork.jsx
│   │   └── shared/
│   │       ├── TimeRangeSelector.jsx
│   │       ├── BrushableChart.jsx (for brushing interaction)
│   │       └── Tooltip.jsx
│   ├── utils/
│   │   ├── dataFetchers.js (API calls)
│   │   ├── scales.js (D3 scale utilities)
│   │   └── formatters.js (number/date formatting)
│   ├── App.jsx
│   └── index.js
├── package.json
└── README.md
```

**Interaction Techniques to Implement**:

1. **Brushing and Linking**
   - Brush on time series → update other views to show selected time range
   - Implementation: shared React state or Context API
   ```jsx
   function Dashboard() {
     const [selectedTimeRange, setSelectedTimeRange] = useState([start, end]);
     const [selectedEmployers, setSelectedEmployers] = useState([]);
     
     return (
       <>
         <TimeBrush onBrush={setSelectedTimeRange} />
         <Chart1 timeRange={selectedTimeRange} />
         <Chart2 timeRange={selectedTimeRange} />
       </>
     );
   }
   ```

2. **Focus + Context (Fisheye)**
   - Detailed view of selected employer while maintaining overview
   - Use React conditional rendering

3. **Hover Tooltips**
   - Show exact values on hover
   - D3's `.on('mouseover')` -> React state update

4. **Filtering**
   - Dropdown to filter by education level, household type
   - Dynamically re-fetch/re-render visualizations

5. **Lasso Selection**
   - For scatter plots: draw polygon to select participant groups
   - Library: `d3-lasso` or custom implementation

### Data Flow Example

**Scenario**: User wants to see wage vs. cost of living for participants with Bachelor's degree

1. **Frontend** (React):
   ```javascript
   // User selects "Bachelors" from dropdown
   setEducationFilter('Bachelors');
   
   // Trigger API call
   const data = await axios.get('/api/wage-vs-cost', {
     params: { education: 'Bachelors' }
   });
   ```

2. **Backend** (Flask):
   ```python
   @app.route('/api/wage-vs-cost')
   def wage_vs_cost():
       education = request.args.get('education')
       
       # Query processed data
       df = pd.read_sql(f"""
           SELECT participantId, avg_wage, avg_cost_of_living, cluster
           FROM participant_monthly
           WHERE education = '{education}'
       """, con=db)
       
       return jsonify(df.to_dict(orient='records'))
   ```

3. **Frontend** (D3 + React):
   ```jsx
   function WageCostScatter({ data }) {
     // D3 creates scales
     const xScale = d3.scaleLinear()...
     const yScale = d3.scaleLinear()...
     
     return (
       <svg>
         {data.map(d => (
           <circle
             key={d.participantId}
             cx={xScale(d.avg_wage)}
             cy={yScale(d.avg_cost_of_living)}
             r={5}
             fill={colorScale(d.cluster)}
           />
         ))}
       </svg>
     );
   }
   ```

### Video Recording (Required)

For the 3-minute demo video:
- Use **OBS Studio** (free) or **Loom** for screen recording
- Show interactive features:
  - Brushing on time series updating heatmap
  - Filtering by demographic updating scatter plots
  - Hovering on network nodes showing employer details
- Add voiceover explaining insights discovered


