import {getCategoryFromSourceCode, scoreCategoryMatch} from './supabase/functions/_shared/categories.ts';

const tests = [
  {title: 'TUC Krekry 100 g', code: '07_Káva__čaj_cukrovinky__slané_pochoutky'},
  {title: "Lay's Chipsy 55 g", code: '07_Káva__čaj_cukrovinky__slané_pochoutky'},
  {title: 'Bohemia Chipsy 190 g', code: '07_Káva__čaj_cukrovinky__slané_pochoutky'},
  {title: 'K-Classic Bramborový snack 110 g', code: '07_Káva__čaj_cukrovinky__slané_pochoutky'},
];

tests.forEach((t) => {
  const mapped = getCategoryFromSourceCode(t.code, 'kaufland');
  const score = scoreCategoryMatch(t.title, 'snacks');
  console.log(`${t.title}\n source=${mapped} score=${score}\n`);
});
