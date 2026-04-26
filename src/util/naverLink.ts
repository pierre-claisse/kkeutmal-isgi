// Lien externe ouvert depuis chaque mot validé de la chaîne :
// dictionnaire Naver KO (onglets multilingues dont FR quand l'entrée existe).

export function naverUrl(word: string): string {
  return `https://ko.dict.naver.com/#/search?query=${encodeURIComponent(word)}`;
}
