const getName = (url: string, pattern: RegExp): string | null => {
  let name = null
  // Function to extract the last part of the URL
  const match = url.match(pattern)
  if (match) name = match[1]
  return name
}

export default getName
