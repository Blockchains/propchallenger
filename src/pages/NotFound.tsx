import { Link } from 'react-router-dom';
import { Head } from '../components/Head';

export function NotFound() {
  return (
    <div className="wrap">
      <Head />
      <h1>Page not found</h1>
      <p><Link to="/">Return to PropChallenger</Link></p>
    </div>
  );
}
