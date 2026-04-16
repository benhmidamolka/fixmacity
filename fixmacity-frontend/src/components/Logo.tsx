import logo from '../assets/logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 80,
};

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const height = sizeMap[size];
  return (
    <img
      src={logo}
      alt="FixmaCity"
      height={height}
      className={className}
      style={{ height: `${height}px`, width: 'auto' }}
    />
  );
}
