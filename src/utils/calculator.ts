export interface DosageResult {
  drops: number;
  frequency: string;
  suggestion: string;
  doseText: string;
  productSuggestionText: string;
}

export function calculateDosage(
  weight: number,
  ageCategory: 'adult' | 'child',
  purpose: 'stamina' | 'recovery' | 'chronic'
): DosageResult {
  const safeWeight = Math.max(5, Math.min(150, weight || 60));
  let drops = Math.round(safeWeight / 10);
  drops = Math.max(2, Math.min(15, drops));

  let frequency = '2 kali sehari (Pagi sebelum sarapan & Malam sebelum tidur)';
  let suggestion = 'British Propolis Regular (Merah)';

  if (ageCategory === 'child') {
    drops = Math.min(4, Math.max(2, Math.round(safeWeight / 10)));
    suggestion = 'British Propolis Green Kids (Hijau). Dapat dicampur madu atau jus buah.';
    if (purpose === 'recovery') {
      frequency = '2-3 kali sehari saat kondisi batuk/pilek';
    }
  } else {
    if (purpose === 'recovery') {
      drops = Math.min(10, drops + 2);
      frequency = '3 kali sehari selama masa pemulihan demam/batuk';
    } else if (purpose === 'chronic') {
      frequency = '3 kali sehari secara teratur 1 jam sebelum makan';
    }
  }

  const doseText = `${drops} Tetes per minum, dikonsumsi ${frequency}.`;
  const productSuggestionText = `Rekomendasi Produk: <strong>${suggestion}</strong>. Larutkan dalam 1/3 gelas air hangat kuku. Aduk merata menggunakan sendok non-logam.`;

  return {
    drops,
    frequency,
    suggestion,
    doseText,
    productSuggestionText
  };
}
