import { createRoot } from 'react-dom/client';
import Startup from './app/startup';
import './shared/styles/tokens.css';
import './shared/styles/reset.css';
createRoot(document.getElementById('root')!).render(<Startup />);
