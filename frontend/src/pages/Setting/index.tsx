import React from 'react';
import { Typography } from '@mui/material';

const Settiong: React.FC = () => {
  return (
    <div>
      <Typography variant="h4">セッティングページ</Typography>
      <Typography>ここはログインしているユーザーだけが見れるページです。</Typography>
    </div>
  );
};

export default Settiong;