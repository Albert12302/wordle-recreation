import { useState, useEffect, useCallback } from "react";
import "./App.css";
import axios from "axios";
import { toast, Toaster } from "sonner";
import { SlArrowRight } from "react-icons/sl";
import { Button } from "./components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { Moon, Sun, HelpCircle } from "lucide-react";

const WORD_LENGTH = 5;
const TOTAL_GUESSES = 6;

interface DatamuseWord {
  word: string;
  score: number;
}

type Theme = "light" | "dark";

function App() {
  const [guessedWords, setGuessedWords] = useState<string[]>(
    new Array(TOTAL_GUESSES).fill("     ")
  );
  const [correctWord, setCorrectWord] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [correctLetterObject, setCorrectLetterObject] = useState<
    Record<string, number>
  >({});
  const [letterCount, setLetterCount] = useState(0);
  const [currentWord, setCurrentWord] = useState("     ");
  const [gameOver, setGameOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("theme") as Theme;
    return savedTheme || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const fetchWord = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get<DatamuseWord[]>(
        "https://api.datamuse.com/words?sp=?????&max=1000"
      );

      if (!response.data || response.data.length === 0) {
        toast.error("Failed to fetch word. Please try again.");
        return;
      }

      const validWords = response.data.filter((item) =>
        /^[a-zA-Z]{5}$/.test(item.word)
      );

      if (validWords.length === 0) {
        toast.error("No valid words found. Please try again.");
        return;
      }

      let word = "";
      let isValidInDictionary = false;

      while (!isValidInDictionary && validWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * validWords.length);
        word = validWords[randomIndex].word;

        try {
          const dictResponse = await axios.get(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
          );
          isValidInDictionary = dictResponse.status === 200;
        } catch {
          validWords.splice(randomIndex, 1);
        }
      }

      if (!isValidInDictionary) {
        toast.error("Could not find a valid word. Please try again.");
        return;
      }

      const letterObject: Record<string, number> = {};
      for (const letter of word) {
        letterObject[letter] = (letterObject[letter] || 0) + 1;
      }

      setCorrectWord(word);
      setCorrectLetterObject(letterObject);
    } catch (error) {
      console.error("Error fetching word:", error);
      toast.error("Failed to fetch word. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateWord = useCallback(async (word: string): Promise<boolean> => {
    try {
      const response = await axios.get(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }, []);

  const updateGuessedWord = useCallback(
    (word: string) => {
      setGuessedWords((current) => {
        const updated = [...current];
        updated[wordCount] = word;
        return updated;
      });
    },
    [wordCount]
  );

  const handleEnter = useCallback(async () => {
    if (gameOver || isValidating) return;

    if (letterCount !== WORD_LENGTH) {
      toast.error("Words must be five letters.");
      return;
    }

    const isValid = await validateWord(currentWord.trim());
    setIsValidating(false);

    if (!isValid) {
      toast.error("Not in the word list!");
      return;
    }
    updateGuessedWord(currentWord);

    if (currentWord.toLowerCase() === correctWord.toLowerCase()) {
      setGameOver(true);
      setTimeout(
        () => toast.success("You've Won!", { duration: Infinity }),
        100
      );
      return;
    }

    if (wordCount === TOTAL_GUESSES - 1) {
      setGameOver(true);
      setTimeout(
        () =>
          toast.error(`You've Lost! The word was: ${correctWord}`, {
            duration: Infinity,
          }),
        100
      );
      return;
    }

    setWordCount((current) => current + 1);
    setLetterCount(0);
    setCurrentWord("     ");
  }, [
    gameOver,
    isValidating,
    letterCount,
    currentWord,
    validateWord,
    updateGuessedWord,
    correctWord,
    wordCount,
  ]);

  const handleBackspace = useCallback(() => {
    if (letterCount === 0 || gameOver || isValidating) {
      return;
    }

    setCurrentWord((prev) => {
      const chars = prev.split("");
      chars[letterCount - 1] = " ";
      return chars.join("");
    });

    setLetterCount((current) => current - 1);
  }, [letterCount, gameOver, isValidating]);

  const handleAlphabetical = useCallback(
    (key: string) => {
      if (letterCount === WORD_LENGTH || gameOver || isValidating) {
        return;
      }

      setCurrentWord((prev) => {
        const chars = prev.split("");
        chars[letterCount] = key.toLowerCase();
        return chars.join("");
      });

      setLetterCount((current) => current + 1);
    },
    [letterCount, gameOver, isValidating]
  );

  const resetGame = useCallback(() => {
    setGuessedWords(new Array(TOTAL_GUESSES).fill("     "));
    setCorrectLetterObject({});
    setCorrectWord("");
    setWordCount(0);
    setLetterCount(0);
    setCurrentWord("     ");
    setGameOver(false);
    setIsValidating(false);
    fetchWord();
    toast.info("Game reset!");
  }, [fetchWord]);

  const handleGiveUp = useCallback(() => {
    if (!gameOver) {
      setGameOver(true);
      toast.info(`The word was: ${correctWord}`, {
        duration: Infinity,
      });
    }
  }, [gameOver, correctWord]);

  useEffect(() => {
    fetchWord();
  }, [fetchWord]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (gameOver || isValidating || isLoading) return;

      if (e.key === "Enter") {
        handleEnter();
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleAlphabetical(e.key);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    handleEnter,
    handleBackspace,
    handleAlphabetical,
    gameOver,
    isValidating,
    isLoading,
  ]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-background py-4 sm:py-8 relative"
      onClick={() => toast.dismiss()}
    >
      <Toaster position="top-center" richColors />

      <div className="absolute top-4 right-4 flex gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="text-sm sm:text-base md:text-xl bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={(e) => e.currentTarget.blur()}
            >
              <HelpCircle className="h-5 w-5 text-gray-900 dark:text-gray-100" />
            </Button>
          </DialogTrigger>
          <DialogContent
            className="max-w-md [&>button]:text-gray-900 [&>button]:dark:text-white [&>button:hover]:bg-gray-100 [&>button:hover]:dark:bg-gray-800 [&>button]:top-7"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">
                How to Play
              </DialogTitle>
              <DialogDescription className="text-left space-y-4 pt-4">
                <p className="text-base">Guess the wordle in 6 tries.</p>

                <div className="space-y-2">
                  <p className="font-semibold text-foreground">Rules:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Each guess must be a valid 5-letter word</li>
                    <li>Press enter to submit your guess</li>
                    <li>The color of the tiles will change after each guess</li>
                    <li>Press "Reset Game" to start a new round.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <p className="font-semibold text-foreground">Examples:</p>

                  <div className="space-y-1">
                    <div className="flex gap-1">
                      <div className="w-10 h-10 border-2 bg-green-500 border-green-600 flex items-center justify-center text-xl font-bold text-black">
                        W
                      </div>
                      <div className="w-10 h-10 border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-black dark:text-white">
                        E
                      </div>
                      <div className="w-10 h-10 border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-black dark:text-white">
                        A
                      </div>
                      <div className="w-10 h-10 border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-black dark:text-white">
                        R
                      </div>
                      <div className="w-10 h-10 border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-black dark:text-white">
                        Y
                      </div>
                    </div>
                    <p className="text-sm">
                      <span className="font-semibold">W</span> is in the word
                      and in the correct position
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex gap-1">
                      <div className="w-10 h-10 border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-black dark:text-white">
                        P
                      </div>
                      <div className="w-10 h-10 border-2 bg-yellow-300 dark:bg-yellow-500 border-yellow-400 dark:border-yellow-600 flex items-center justify-center text-xl font-bold text-black">
                        I
                      </div>
                      <div className="w-10 h-10 border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-black dark:text-white">
                        L
                      </div>
                      <div className="w-10 h-10 border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-black dark:text-white">
                        L
                      </div>
                      <div className="w-10 h-10 border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-black dark:text-white">
                        S
                      </div>
                    </div>
                    <p className="text-sm">
                      <span className="font-semibold">I</span> is in the word
                      but in the wrong position
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex gap-1">
                      <div className="w-10 h-10 border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-black dark:text-white">
                        V
                      </div>
                      <div className="w-10 h-10 border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-black dark:text-white">
                        A
                      </div>
                      <div className="w-10 h-10 border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-black dark:text-white">
                        G
                      </div>
                      <div className="w-10 h-10 border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-black dark:text-white">
                        U
                      </div>
                      <div className="w-10 h-10 border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-black dark:text-white">
                        E
                      </div>
                    </div>
                    <p className="text-sm">
                      <span className="font-semibold">U</span> is not in the
                      word in any position
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="text-sm sm:text-base md:text-xl px-3 py-1 sm:px-4 sm:py-2">
              <span>Select Theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              <span>Light</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h1 className="text-[27px] sm:text-4xl md:text-5xl lg:text-[52px] text-foreground font-extrabold mb-4 sm:mb-8 pl-8 sm:pl-12">
        Guess the Word!
      </h1>

      <div className="pl-8 sm:pl-12">
        {guessedWords.map((word, index) => {
          const isCurrentRow = index === wordCount && !gameOver;

          return (
            <div key={index} className="flex flex-row items-center">
              <div className="w-8 sm:w-12 flex justify-end pr-1 sm:pr-2">
                {isCurrentRow && (
                  <span className="text-foreground text-2xl sm:text-3xl md:text-4xl">
                    <SlArrowRight />
                  </span>
                )}
              </div>
              <WordLine
                correctWord={correctWord}
                correctLetterObject={correctLetterObject}
                revealed={index === wordCount ? gameOver : index < wordCount}
                word={index === wordCount ? currentWord : word}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 sm:gap-4 mt-4 sm:mt-8 px-4">
        <Button
          variant="destructive"
          size="lg"
          className="text-sm sm:text-base md:text-xl px-3 py-1 sm:px-4 sm:py-2"
          onClick={(e) => {
            handleGiveUp();
            e.currentTarget.blur();
          }}
          disabled={gameOver}
        >
          Give Up
        </Button>
        <Button
          size="lg"
          className="text-sm sm:text-base md:text-xl px-3 py-1 sm:px-4 sm:py-2"
          onClick={(e) => {
            resetGame();
            e.currentTarget.blur();
          }}
        >
          Reset Game
        </Button>
      </div>
    </div>
  );
}

function WordLine({
  word,
  correctWord,
  correctLetterObject,
  revealed,
}: {
  word: string;
  correctWord: string;
  correctLetterObject: Record<string, number>;
  revealed: boolean;
}) {
  const letters = word.split("");

  const letterStates = letters.map((letter, index) => {
    const lowerLetter = letter.toLowerCase();
    const isCorrectPosition = lowerLetter === correctWord[index];
    return {
      letter,
      green: isCorrectPosition && revealed,
      yellow: false,
    };
  });

  if (revealed) {
    const availableLetters = { ...correctLetterObject };

    letterStates.forEach((state) => {
      if (state.green) {
        const lowerLetter = state.letter.toLowerCase();
        availableLetters[lowerLetter] =
          (availableLetters[lowerLetter] || 0) - 1;
      }
    });

    letterStates.forEach((state) => {
      if (!state.green) {
        const lowerLetter = state.letter.toLowerCase();
        if (availableLetters[lowerLetter] > 0) {
          state.yellow = true;
          availableLetters[lowerLetter]--;
        }
      }
    });
  }

  return (
    <div className="flex flex-row space-x-1 sm:space-x-2 m-2 sm:m-4">
      {letterStates.map((state, index) => (
        <LetterBox
          key={index}
          letter={state.letter}
          green={state.green}
          yellow={state.yellow}
        />
      ))}
    </div>
  );
}

function LetterBox({
  letter,
  green,
  yellow,
}: {
  letter: string;
  green: boolean;
  yellow: boolean;
}) {
  return (
    <div
      className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-22 lg:w-22 border-2 sm:border-4 flex items-center justify-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold 
    ${
      green
        ? "bg-green-500 border-green-600 text-black dark:bg-green-600 dark:border-green-700 dark:text-black"
        : yellow
        ? "bg-yellow-300 border-yellow-400 text-black dark:bg-yellow-500 dark:border-yellow-600 dark:text-black"
        : "bg-white dark:bg-gray-800 text-black dark:text-gray-200 border-gray-300 dark:border-gray-600"
    }`}
    >
      {letter}
    </div>
  );
}

export default App;
