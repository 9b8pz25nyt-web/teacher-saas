// src/lib/currency.ts


export async function convertToPHP(
  amount: number,
  currency: string
) {


  // If already PHP
  if (currency === "PHP") {

    return amount;

  }



  const response = await fetch(
    `https://api.exchangerate-api.com/v4/latest/${currency}`
  );



  if (!response.ok) {

    throw new Error(
      "Unable to get exchange rate"
    );

  }



  const data = await response.json();



  const rate = data.rates.PHP;



  if (!rate) {

    throw new Error(
      "PHP conversion not found"
    );

  }



  return amount * rate;


}