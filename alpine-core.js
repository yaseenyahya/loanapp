document.addEventListener('alpine:init', () => {

    Alpine.store('wallet', {
        data: {},
        trades: [],
        loans: [],
        loadedKit: false
    })

    Alpine.data('data', () => ({
        async init() {
            dbclient = supabase.createClient('https://pahnribyggmztgaliyyr.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG5yaWJ5Z2dtenRnYWxpeXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc0NTAwOTQsImV4cCI6MjA0MzAyNjA5NH0.odaCLMxoK5NFg3Wy7ruxpF_ZDlhg8VFU1N9Q2vf4T04')
            this.initPath()
            this.loaded = true
        },
        loaded: false,
        borrowing: false,
        wantToCheckOut: false,
        wantToBorrow: undefined,
        selectedNav: 'Home',
        navLinks: ["Home", 'Portfolio', 'Arbitrage', 'Borrow'],
        showCalculating: false,
        calculatedTrade: undefined,

        initPath() {
            const link = new URL(window.location.href)
            const hash = (link.hash || "Portfolio").replace('#', '')
            this.navigate(hash)
        },

        navigate(path) {
            this.selectedNav = path;
            const link = new URL(window.location.href)
            link.hash = this.selectedNav
            window.location.href = link.href
        },

        async calculateTrade(trade) {
            this.showCalculating = true;
            setTimeout((() => {
                this.calculatedTrade = { ...trade }
            }).bind(this), 500)
        },

        async borrowLoan(amount) {
            if (amount < 100) {
                Swal.fire({
                    title: 'Invalid Amount!',
                    text: 'Minimum Loan is $100',
                    icon: 'error',
                })
                return
            }


        },

        async saveTrade(tradeData) {
            tradeData.status = false
            const { data, error } = await dbclient.from('trades').insert({ address: Alpine.store('wallet').data.address, data: tradeData }).select('*')
            Alpine.store('wallet').trades = [...Alpine.store('wallet').trades, data[0]]

        },

        async trade(tradeData) {
            const address = await core.signer.getAddress()
            const amount = tradeData.amount

            if (tradeData.selected_coin == 'bnb') { // trade with BNB
                const balance = Number(core.ethers.formatEther(await core.provider.getBalance(address)))
                if (balance < amount) {
                    Swal.fire({
                        title: 'Low BNB!',
                        html: `Not enough BNB to make trade<br><br>Current balance: <b class="text-green-400">${balance.toFixed(4)} BNB</b><br>Expected balance: <b class="text-green-400">${amount} BNB</b>`,
                        icon: 'error',
                    })
                    return
                }

                try {
                    const tx = await platformContract.tradeWithEth({ value: core.ethers.parseEther(amount.toString()) })
                    await tx.wait()
                }
                catch (e) {
                    // render trade feedback error
                    return
                }

                return await this.saveTrade(tradeData);
            }

            if (tradeData.selected_coin == 'usdt') { // trade with usdt
                const balance = Number(core.ethers.formatUnits(await usdtContract.balanceOf(address), 18))
                if (balance < amount) {
                    Swal.fire({
                        title: 'Low USDT!',
                        html: `Not enough USDT to make trade<br><br>Current balance: <b class="text-green-400">${balance.toFixed(4)} USDT</b><br>Expected balance: <b class="text-green-400">${amount} USDT</b>`,
                        icon: 'error',
                    })
                    return
                }

                const allowance = Number(core.ethers.formatUnits(await usdtContract.allowance(address, platformContractAddress)))

                if (allowance < amount) {
                    try {
                        const tx = await usdtContract.increaseAllowance(platformContractAddress, core.ethers.parseUnits(amount.toString(), 18))
                        await tx.wait()
                    }
                    catch (e) {
                        Swal.fire({
                            title: 'Approve',
                            html: `Unable to approve`,
                            icon: 'error',
                        })
                        return
                    }
                }
                try {
                    const tx = await platformContract.tradeWithUsdt(core.ethers.parseUnits(amount.toString(), 18))
                    await tx.wait()
                }
                catch (e) {
                    // render trade feedback error
                    return
                }

                return await this.saveTrade(tradeData)
            }


            if (amount < 100) {
                Swal.fire({
                    title: 'Invalid Amount!',
                    text: 'Minimum Loan is $100',
                    icon: 'error',
                })
                return
            }
            try {
                const tx = await platformContract.trade(core.ethers.parseUnits(amount.toString(), 18));
                await tx.wait()
            }
            catch (e) {
                // render trade feedback error
                return
            }
            return await this.saveTrade(tradeData)
        }
        ,

        async repayLoan() {
            const address = await core.signer.getAddress()

            const allowance = Number(core.ethers.formatUnits(await usdtContract.allowance(address, platformContractAddress)))
            const amount = core.ethers.formatUnits(await platformContract.getBorrowed(address), 18)


            if (allowance < amount) {
                try {
                    const tx = await usdtContract.increaseAllowance(platformContractAddress, core.ethers.parseUnits(amount.toString(), 18))
                    await tx.wait()
                }
                catch (e) {
                    Swal.fire({
                        title: 'Approve',
                        html: `Unable to approve`,
                        icon: 'error',
                    })
                    return
                }
            }

            try {
                const tx = await platformContract.payBackLoan();
                await tx.wait()
            }
            catch (e) {
                // render error
                return
            }
        }
    }))


})
