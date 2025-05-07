"use client";

import { useState, useEffect } from "react";

// Define transaction interface
interface Transaction {
  hash: string;
  authorization_list?: Record<string, unknown>[];
}

// Define block interface
interface Block {
  block_number: number;
  transactions: Transaction[];
}

export default function Home() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [latestTxHashes, setLatestTxHashes] = useState<string[]>([]);
  const [latestBlockProcessed, setLatestBlockProcessed] =
    useState<number>(22400000);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [archiveHeight, setArchiveHeight] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch("https://eth.hypersync.xyz/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from_block: latestBlockProcessed,
            include_all_blocks: true,
            transactions: [
              {
                authorization_list: [{}],
              },
            ],
            join_mode: "JoinAll",
            field_selection: {
              block: ["block_number"],
              transaction: ["authorization_list", "hash"],
            },
          }),
        });

        const data = await response.json();

        // Extract archive_height if available
        if (data && data.archive_height) {
          setArchiveHeight(data.archive_height);
        }

        if (data && data.data && data.data.length > 0) {
          // Process new blocks and find the latest block number
          let newMaxBlock = latestBlockProcessed;
          let newTransactions: Transaction[] = [];

          data.data.forEach((block: Block) => {
            if (block.block_number > newMaxBlock) {
              newMaxBlock = block.block_number;
            }
            if (block.transactions) {
              newTransactions = newTransactions.concat(block.transactions);
            }
          });

          // Only update if we have new transactions
          if (newTransactions.length > 0) {
            const updatedTransactions = [
              ...allTransactions,
              ...newTransactions,
            ];
            setAllTransactions(updatedTransactions);
            setCount(updatedTransactions.length);

            // Extract and store the 10 latest transaction hashes
            const hashes = updatedTransactions
              .slice(Math.max(0, updatedTransactions.length - 10))
              .map((tx: Transaction) => tx.hash)
              .filter((hash: string) => hash); // Filter out any undefined hashes

            setLatestTxHashes(hashes);
          }

          // Update the latest block we've processed
          if (newMaxBlock > latestBlockProcessed) {
            setLatestBlockProcessed(newMaxBlock);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval for fetching data every 3 seconds
    const intervalId = setInterval(fetchData, 3000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center max-w-3xl px-4">
        <h1 className="text-xl font-medium mb-4 text-gray-500 dark:text-gray-400">
          EIP-7702 Transactions
        </h1>
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 mx-auto mb-6">
          {loading && count === 0 ? (
            <div className="animate-pulse h-24 flex items-center justify-center">
              <div className="text-gray-300 dark:text-gray-600">Loading...</div>
            </div>
          ) : (
            <div className="text-6xl font-bold text-indigo-600 dark:text-indigo-400">
              {count.toLocaleString()}
            </div>
          )}
        </div>

        {latestTxHashes.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 mx-auto">
            <h2 className="text-lg font-medium mb-4 text-gray-600 dark:text-gray-300">
              Latest 10 EIP-7702 Transactions
            </h2>
            <div className="overflow-hidden">
              {latestTxHashes
                .slice()
                .reverse()
                .map((hash, index) => (
                  <div
                    key={index}
                    className="text-xs md:text-sm font-mono mb-2 text-left p-2 bg-gray-50 dark:bg-gray-700 rounded truncate hover:text-indigo-500 transition-colors"
                  >
                    <a
                      href={`https://etherscan.io/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {hash}
                    </a>
                  </div>
                ))}
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
          Latest block height: {archiveHeight.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
