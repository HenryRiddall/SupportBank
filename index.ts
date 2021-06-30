import {DateTime} from "luxon";
import readline = require('readline')
import csv = require('csv-parser');
import fs = require('fs');

class Account {
    name: string = ""
    transactions: Transaction[] = []
    balance: number  = 0

    constructor(name: string) {
        this.name = name
    }

    addBalance(amount: number): void {
        this.balance = this.balance + amount
    }

    toString(): string {
        return this.name
    }

}
class Transaction{
    date: object
    from: Account | undefined
    to: Account | undefined
    narrative: string
    amount: number = 0

    constructor(date: object, from: Account, to: Account, narrative: string, amount: number) {
        this.date = date
        this.from = from
        this.to = to
        this.narrative = narrative
        this.amount = amount
    }
}

function readCSV(){
    const transactions: { [key: string]: string }[] = [];
    fs.createReadStream('Transactions2014.csv')
        .pipe(csv())
        .on('data', (data) => transactions.push(data))
        .on('end', () => {
            parseList(transactions)
        });
}

function parseList(list: { [name: string]: string }[]) {
    let transactions: Transaction[] = []
    let accounts: Account[] = []
    list.forEach(function (transaction: { [key: string]: string }){
        addTransaction(transaction, accounts, transactions)
    })
    console.log(accounts)
}

function addTransaction(transaction: { [key: string]: string }, accounts: Account[], transactions: Transaction[]) {
    const accountNames: string[] = accounts.map(i => i.name)
    if (!accountNames.includes(transaction.From)) {
        accounts.push(new Account(transaction.From))
    }
}


function parseDate(dateString: string) {
    return DateTime.fromFormat(dateString, "d/M/yyyy")
}

readCSV()