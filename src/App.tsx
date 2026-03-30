import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from './styles/theme';
import { GlobalStyles } from './styles/GlobalStyles';
import Layout from './components/Layout/Layout';
import AppRoutes from './AppRoutes';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <Router>
        <Layout>
          <AppRoutes />
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
