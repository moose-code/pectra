"use client";

import { useState, useEffect } from "react";

// Define transaction interface
interface Transaction {
  hash: string;
  authorization_list?: Record<string, unknown>[];
  block_number?: number;
  transaction_index?: number;
  from?: string;
  to?: string;
  value?: string;
  input?: string;
}

// Define block interface
interface Block {
  block_number: number;
  transactions: Transaction[];
}

// Define address frequency interface
interface AddressFrequency {
  address: string;
  count: number;
}

export default function Home() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [latestTxs, setLatestTxs] = useState<Transaction[]>([]);
  const [latestBlockProcessed, setLatestBlockProcessed] =
    useState<number>(22400000);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [archiveHeight, setArchiveHeight] = useState<number>(0);
  const [topFromAddresses, setTopFromAddresses] = useState<AddressFrequency[]>(
    []
  );
  const [topToAddresses, setTopToAddresses] = useState<AddressFrequency[]>([]);

  // Function to get address frequencies
  const getAddressFrequencies = (
    transactions: Transaction[],
    field: "from" | "to"
  ) => {
    const addressCounts: Record<string, number> = {};

    transactions.forEach((tx) => {
      const address = tx[field];
      if (address) {
        addressCounts[address] = (addressCounts[address] || 0) + 1;
      }
    });

    return Object.entries(addressCounts)
      .map(([address, count]) => ({ address, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Get top 10
  };

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
              transaction: [
                "authorization_list",
                "hash",
                "block_number",
                "transaction_index",
                "from",
                "to",
                "value",
                "input",
              ],
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

            // Store the 10 latest transactions
            const latestTransactions = updatedTransactions
              .slice(Math.max(0, updatedTransactions.length - 10))
              .filter((tx: Transaction) => tx.hash);

            setLatestTxs(latestTransactions.reverse());

            // Update address frequencies
            setTopFromAddresses(
              getAddressFrequencies(updatedTransactions, "from")
            );
            setTopToAddresses(getAddressFrequencies(updatedTransactions, "to"));
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

  const shortenAddress = (address: string) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center w-full max-w-6xl px-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {latestTxs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6">
              <h2 className="text-lg font-medium mb-4 text-gray-600 dark:text-gray-300">
                Latest 10 EIP-7702 Transactions
              </h2>
              <div className="overflow-hidden">
                {latestTxs.map((tx, index) => (
                  <div
                    key={index}
                    className="text-xs md:text-sm font-mono mb-3 text-left p-3 bg-gray-50 dark:bg-gray-700 rounded hover:text-indigo-500 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        From:{" "}
                        <span className="text-blue-500">
                          {tx.from ? shortenAddress(tx.from) : "Unknown"}
                        </span>
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        To:{" "}
                        <span className="text-green-500">
                          {tx.to ? shortenAddress(tx.to) : "Unknown"}
                        </span>
                      </div>
                    </div>
                    <a
                      href={`https://etherscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate block"
                    >
                      {tx.hash}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6">
            <h2 className="text-lg font-medium mb-4 text-gray-600 dark:text-gray-300">
              Top Addresses in EIP-7702 Transactions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2 text-blue-500">
                  Top From Addresses
                </h3>
                <div className="overflow-hidden">
                  {topFromAddresses.map((item, index) => (
                    <div
                      key={index}
                      className="text-xs md:text-sm mb-2 text-left p-2 bg-gray-50 dark:bg-gray-700 rounded flex justify-between"
                    >
                      <a
                        href={`https://etherscan.io/address/${item.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline font-mono truncate"
                      >
                        {shortenAddress(item.address)}
                      </a>
                      <span className="text-indigo-500 font-medium">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2 text-green-500">
                  Top To Addresses
                </h3>
                <div className="overflow-hidden">
                  {topToAddresses.map((item, index) => (
                    <div
                      key={index}
                      className="text-xs md:text-sm mb-2 text-left p-2 bg-gray-50 dark:bg-gray-700 rounded flex justify-between"
                    >
                      <a
                        href={`https://etherscan.io/address/${item.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline font-mono truncate"
                      >
                        {shortenAddress(item.address)}
                      </a>
                      <span className="text-indigo-500 font-medium">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
          Latest block height: {archiveHeight.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
