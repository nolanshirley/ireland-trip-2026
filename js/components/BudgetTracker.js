// =============================================================
//  Component: BudgetTracker & Family Expense Settlement Hub
//  (Clean-Slate Budget Estimator + Primary Inputs + Ledger)
// =============================================================

const BudgetTracker = {
  name: 'BudgetTracker',
  props: {
    baseExpenses: { type: Array, default: () => [] }
  },
  data() {
    return {
      // Primary Trip Budget Form Inputs (Clean Slate - no dummy examples)
      budgetInputs: {
        flightCost: '',
        flightMode: 'per_person', // 'per_person' ($/person) or 'total'
        flightCurrency: 'USD',
        transitCost: '',
        transitCurrency: 'EUR',
        transitNotes: 'Rental 7-Seater/SUV + Diesel Fuel + M50/M1 Tolls',
        foodCost: '',
        foodMode: 'per_day', // 'per_day' (€/person/day) or 'total'
        foodDays: 13,
        foodCurrency: 'EUR',
        lodgingCost: '',
        lodgingCurrency: 'EUR',
        activitiesCost: '',
        activitiesCurrency: 'EUR'
      },

      // On-The-Road Logged Receipts (Starts empty with 0 dummy items)
      customExpenses: [],
      familyMembers: ['Dad', 'Mom', 'Erin', 'Noland'],
      newMemberName: '',
      activeCategoryFilter: 'all', // 'all', 'Dining', 'Transit', 'Lodging', 'Activities', 'Shopping', 'Misc'
      activeCurrencyFilter: 'all', // 'all', 'EUR', 'GBP', 'USD'
      activePayerFilter: 'all',
      searchQuery: '',
      showAddForm: false,
      showTippingGuide: false,
      eurToUsd: 1.08,
      gbpToUsd: 1.30,
      newExpense: {
        title: '',
        category: 'Dining',
        currency: 'EUR',
        amount: '',
        payer: 'Dad',
        splitWith: ['Dad', 'Mom', 'Erin', 'Noland'],
        notes: ''
      }
    };
  },
  created() {
    this.loadStorage();
  },
  computed: {
    // ── Primary Budget Form Computations ────────────────────────
    travelerCount() {
      return Math.max(1, this.familyMembers.length);
    },

    flightTotalUsd() {
      const amt = parseFloat(this.budgetInputs.flightCost) || 0;
      const total = this.budgetInputs.flightMode === 'per_person' ? amt * this.travelerCount : amt;
      return this.budgetInputs.flightCurrency === 'EUR' ? total * this.eurToUsd : total;
    },

    flightTotalEur() {
      return this.eurToUsd > 0 ? this.flightTotalUsd / this.eurToUsd : 0;
    },

    transitTotalUsd() {
      const amt = parseFloat(this.budgetInputs.transitCost) || 0;
      return this.budgetInputs.transitCurrency === 'EUR' ? amt * this.eurToUsd : amt;
    },

    transitTotalEur() {
      return this.eurToUsd > 0 ? this.transitTotalUsd / this.eurToUsd : 0;
    },

    foodTotalUsd() {
      const amt = parseFloat(this.budgetInputs.foodCost) || 0;
      const days = parseInt(this.budgetInputs.foodDays) || 13;
      const total = this.budgetInputs.foodMode === 'per_day' ? amt * days * this.travelerCount : amt;
      return this.budgetInputs.foodCurrency === 'EUR' ? total * this.eurToUsd : total;
    },

    foodTotalEur() {
      return this.eurToUsd > 0 ? this.foodTotalUsd / this.eurToUsd : 0;
    },

    lodgingTotalUsd() {
      const amt = parseFloat(this.budgetInputs.lodgingCost) || 0;
      return this.budgetInputs.lodgingCurrency === 'EUR' ? amt * this.eurToUsd : amt;
    },

    lodgingTotalEur() {
      return this.eurToUsd > 0 ? this.lodgingTotalUsd / this.eurToUsd : 0;
    },

    activitiesTotalUsd() {
      const amt = parseFloat(this.budgetInputs.activitiesCost) || 0;
      return this.budgetInputs.activitiesCurrency === 'EUR' ? amt * this.eurToUsd : amt;
    },

    activitiesTotalEur() {
      return this.eurToUsd > 0 ? this.activitiesTotalUsd / this.eurToUsd : 0;
    },

    grandTotalEstimatedUsd() {
      return (
        this.flightTotalUsd +
        this.transitTotalUsd +
        this.foodTotalUsd +
        this.lodgingTotalUsd +
        this.activitiesTotalUsd
      );
    },

    grandTotalEstimatedEur() {
      return this.eurToUsd > 0 ? this.grandTotalEstimatedUsd / this.eurToUsd : 0;
    },

    perPersonEstimatedUsd() {
      return this.grandTotalEstimatedUsd / this.travelerCount;
    },

    perPersonEstimatedEur() {
      return this.eurToUsd > 0 ? this.perPersonEstimatedUsd / this.eurToUsd : 0;
    },

    estimatedBreakdown() {
      const total = this.grandTotalEstimatedUsd || 1;
      return [
        {
          key: 'flights',
          label: 'Flights',
          icon: '✈️',
          usd: Math.round(this.flightTotalUsd),
          eur: Math.round(this.flightTotalEur),
          pct: Math.round((this.flightTotalUsd / total) * 100)
        },
        {
          key: 'transit',
          label: 'Transportation',
          icon: '🚗',
          usd: Math.round(this.transitTotalUsd),
          eur: Math.round(this.transitTotalEur),
          pct: Math.round((this.transitTotalUsd / total) * 100)
        },
        {
          key: 'food',
          label: 'Food & Dining',
          icon: '🍽️',
          usd: Math.round(this.foodTotalUsd),
          eur: Math.round(this.foodTotalEur),
          pct: Math.round((this.foodTotalUsd / total) * 100)
        },
        {
          key: 'lodging',
          label: 'Lodging / Stays',
          icon: '🏨',
          usd: Math.round(this.lodgingTotalUsd),
          eur: Math.round(this.lodgingTotalEur),
          pct: Math.round((this.lodgingTotalUsd / total) * 100)
        },
        {
          key: 'activities',
          label: 'Activities & Shopping',
          icon: '🛍️',
          usd: Math.round(this.activitiesTotalUsd),
          eur: Math.round(this.activitiesTotalEur),
          pct: Math.round((this.activitiesTotalUsd / total) * 100)
        }
      ].filter(item => item.usd > 0);
    },

    // ── Logged Ledger Computations ──────────────────────────────
    allExpenses() {
      // Filter out any legacy dummy ids that may have been saved previously in localStorage
      return this.customExpenses.filter(e => !e.id || !e.id.startsWith('exp_hotel_') && !e.id.startsWith('exp_rental_car') && !e.id.startsWith('exp_misters') && !e.id.startsWith('exp_guinness') && !e.id.startsWith('exp_titanic') && !e.id.startsWith('exp_moher') && !e.id.startsWith('exp_black_cab') && !e.id.startsWith('exp_fuel_tolls'));
    },

    filteredExpenses() {
      return this.allExpenses.filter(exp => {
        if (this.activeCategoryFilter !== 'all' && exp.category !== this.activeCategoryFilter) return false;
        if (this.activeCurrencyFilter !== 'all' && exp.currency !== this.activeCurrencyFilter) return false;
        if (this.activePayerFilter !== 'all') {
          if (this.activePayerFilter === 'Split' && exp.payer !== 'Split') return false;
          if (this.activePayerFilter !== 'Split' && exp.payer !== this.activePayerFilter) return false;
        }
        if (!this.searchQuery.trim()) return true;
        const q = this.searchQuery.toLowerCase();
        return (
          exp.title.toLowerCase().includes(q) ||
          (exp.notes && exp.notes.toLowerCase().includes(q)) ||
          (exp.category && exp.category.toLowerCase().includes(q)) ||
          (exp.payer && exp.payer.toLowerCase().includes(q))
        );
      });
    },

    actualSpentEur() {
      return this.allExpenses
        .filter(e => e.currency === 'EUR' || !e.currency)
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    },

    actualSpentGbp() {
      return this.allExpenses
        .filter(e => e.currency === 'GBP')
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    },

    actualSpentUsdEquivalent() {
      const directUsd = this.allExpenses
        .filter(e => e.currency === 'USD')
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      return (this.actualSpentEur * this.eurToUsd) + (this.actualSpentGbp * this.gbpToUsd) + directUsd;
    },

    memberBalances() {
      const members = this.familyMembers;
      const count = Math.max(1, members.length);
      const balances = {};
      members.forEach(m => {
        balances[m] = { name: m, paidUsd: 0, shareUsd: 0, netUsd: 0 };
      });

      this.allExpenses.forEach(e => {
        const amt = parseFloat(e.amount) || 0;
        let usd = amt;
        if (e.currency === 'EUR') usd = amt * this.eurToUsd;
        else if (e.currency === 'GBP') usd = amt * this.gbpToUsd;

        const payer = e.payer;
        if (balances[payer]) {
          balances[payer].paidUsd += usd;
        } else {
          members.forEach(m => {
            balances[m].paidUsd += usd / count;
          });
        }

        const beneficiaries = (Array.isArray(e.splitWith) && e.splitWith.length > 0)
          ? e.splitWith.filter(m => balances[m])
          : members;
        const bCount = Math.max(1, beneficiaries.length);
        beneficiaries.forEach(m => {
          balances[m].shareUsd += usd / bCount;
        });
      });

      Object.values(balances).forEach(b => {
        b.netUsd = Math.round(b.paidUsd - b.shareUsd);
        b.paidUsd = Math.round(b.paidUsd);
        b.shareUsd = Math.round(b.shareUsd);
      });

      return Object.values(balances);
    },

    settlementSteps() {
      const debtors = [];
      const creditors = [];

      this.memberBalances.forEach(m => {
        if (m.netUsd < -1) {
          debtors.push({ name: m.name, amount: -m.netUsd });
        } else if (m.netUsd > 1) {
          creditors.push({ name: m.name, amount: m.netUsd });
        }
      });

      const steps = [];
      let dIdx = 0;
      let cIdx = 0;

      while (dIdx < debtors.length && cIdx < creditors.length) {
        const debtor = debtors[dIdx];
        const creditor = creditors[cIdx];
        const transfer = Math.min(debtor.amount, creditor.amount);

        if (transfer > 1) {
          steps.push({
            from: debtor.name,
            to: creditor.name,
            amountUsd: Math.round(transfer),
            amountEur: Math.round(transfer / this.eurToUsd)
          });
        }

        debtor.amount -= transfer;
        creditor.amount -= transfer;

        if (debtor.amount <= 1) dIdx++;
        if (creditor.amount <= 1) cIdx++;
      }

      return steps;
    }
  },
  methods: {
    loadStorage() {
      try {
        const savedInputs = localStorage.getItem('ireland_trip_budget_inputs');
        if (savedInputs) {
          this.budgetInputs = Object.assign(this.budgetInputs, JSON.parse(savedInputs));
        }

        const savedExpenses = localStorage.getItem('ireland_custom_expenses');
        if (savedExpenses) {
          const raw = JSON.parse(savedExpenses);
          // Purge any legacy dummy items
          this.customExpenses = raw.filter(e => !e.id || (!e.id.startsWith('exp_hotel_') && !e.id.startsWith('exp_rental_car') && !e.id.startsWith('exp_misters') && !e.id.startsWith('exp_guinness') && !e.id.startsWith('exp_titanic') && !e.id.startsWith('exp_moher') && !e.id.startsWith('exp_black_cab') && !e.id.startsWith('exp_fuel_tolls')));
        }

        const savedMembers = localStorage.getItem('ireland_family_members');
        if (savedMembers) this.familyMembers = JSON.parse(savedMembers);

        const savedEurRate = localStorage.getItem('ireland_rate_eur_usd');
        if (savedEurRate) this.eurToUsd = parseFloat(savedEurRate);

        const savedGbpRate = localStorage.getItem('ireland_rate_gbp_usd');
        if (savedGbpRate) this.gbpToUsd = parseFloat(savedGbpRate);

        this.newExpense.splitWith = [...this.familyMembers];
        this.newExpense.payer = this.familyMembers[0] || 'Dad';
      } catch (e) {
        console.error('Error loading budget data', e);
      }
    },

    saveBudgetInputs() {
      localStorage.setItem('ireland_trip_budget_inputs', JSON.stringify(this.budgetInputs));
      if (window.TravelApp && window.TravelApp.notify) {
        window.TravelApp.notify('Trip budget estimates updated', '💾');
      }
    },

    resetBudgetInputs() {
      if (confirm('Reset all budget form inputs to zero?')) {
        this.budgetInputs = {
          flightCost: '',
          flightMode: 'per_person',
          flightCurrency: 'USD',
          transitCost: '',
          transitCurrency: 'EUR',
          transitNotes: 'Rental 7-Seater/SUV + Diesel Fuel + M50/M1 Tolls',
          foodCost: '',
          foodMode: 'per_day',
          foodDays: 13,
          foodCurrency: 'EUR',
          lodgingCost: '',
          lodgingCurrency: 'EUR',
          activitiesCost: '',
          activitiesCurrency: 'EUR'
        };
        this.saveBudgetInputs();
      }
    },

    saveExpenses() {
      localStorage.setItem('ireland_custom_expenses', JSON.stringify(this.customExpenses));
    },

    saveMembers() {
      localStorage.setItem('ireland_family_members', JSON.stringify(this.familyMembers));
    },

    saveRates() {
      localStorage.setItem('ireland_rate_eur_usd', this.eurToUsd.toString());
      localStorage.setItem('ireland_rate_gbp_usd', this.gbpToUsd.toString());
    },

    addFamilyMember() {
      const name = this.newMemberName.trim();
      if (name && !this.familyMembers.includes(name)) {
        this.familyMembers.push(name);
        this.newMemberName = '';
        this.saveMembers();
        this.newExpense.splitWith = [...this.familyMembers];
      }
    },

    removeFamilyMember(name) {
      if (this.familyMembers.length <= 1) {
        alert('Keep at least 1 traveler in your party.');
        return;
      }
      this.familyMembers = this.familyMembers.filter(m => m !== name);
      this.saveMembers();
      this.newExpense.splitWith = this.newExpense.splitWith.filter(m => m !== name);
    },

    toggleSplitMember(member) {
      if (this.newExpense.splitWith.includes(member)) {
        if (this.newExpense.splitWith.length > 1) {
          this.newExpense.splitWith = this.newExpense.splitWith.filter(m => m !== member);
        }
      } else {
        this.newExpense.splitWith.push(member);
      }
    },

    selectAllSplitMembers() {
      this.newExpense.splitWith = [...this.familyMembers];
    },

    submitExpense() {
      if (!this.newExpense.title.trim() || !this.newExpense.amount) return;
      const exp = {
        id: 'exp_' + Date.now(),
        title: this.newExpense.title.trim(),
        category: this.newExpense.category,
        currency: this.newExpense.currency,
        amount: parseFloat(this.newExpense.amount) || 0,
        payer: this.newExpense.payer,
        splitWith: [...this.newExpense.splitWith],
        notes: this.newExpense.notes.trim(),
        createdAt: new Date().toISOString(),
        isCustom: true
      };
      this.customExpenses.unshift(exp);
      this.saveExpenses();
      if (window.TravelApp && window.TravelApp.notify) {
        const sym = exp.currency === 'GBP' ? '£' : (exp.currency === 'USD' ? '$' : '€');
        window.TravelApp.notify(`Logged ${sym}${exp.amount}: ${exp.title}`, '💶');
      }
      this.newExpense.title = '';
      this.newExpense.amount = '';
      this.newExpense.notes = '';
      this.showAddForm = false;
    },

    deleteExpense(id) {
      if (confirm('Remove this expense item from your ledger?')) {
        this.customExpenses = this.customExpenses.filter(e => e.id !== id);
        this.saveExpenses();
        if (window.TravelApp && window.TravelApp.notify) {
          window.TravelApp.notify('Expense removed from ledger', '🗑️');
        }
      }
    },

    clearAllCustomExpenses() {
      if (confirm('Clear all logged receipt items? This cannot be undone.')) {
        this.customExpenses = [];
        this.saveExpenses();
        if (window.TravelApp && window.TravelApp.notify) {
          window.TravelApp.notify('Ledger cleared', '🧹');
        }
      }
    },

    exportCsv() {
      let csv = 'Title,Category,Amount,Currency,Payer,SplitWith,Notes\n';
      this.allExpenses.forEach(e => {
        const split = Array.isArray(e.splitWith) ? e.splitWith.join(';') : '';
        csv += `"${(e.title || '').replace(/"/g, '""')}","${e.category || ''}",${e.amount || 0},"${e.currency || 'EUR'}","${e.payer || ''}","${split}","${(e.notes || '').replace(/"/g, '""')}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ireland-trip-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },

    printBudgetSummary() {
      window.print();
    }
  },
  template: `
    <div class="space-y-6">

      <!-- ======================================================= -->
      <!-- TOP ESTIMATED BUDGET TOTALS & SUMMARY CARDS             -->
      <!-- ======================================================= -->
      <div class="card p-5 sm:p-6 border-2 border-[var(--accent)]/40 bg-[var(--card)] shadow-lg space-y-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-2xl">💶</span>
              <h2 class="text-xl sm:text-2xl font-black text-[var(--foreground)] tracking-tight">
                Trip Budget Calculator & Total Expenses
              </h2>
            </div>
            <p class="text-xs text-[var(--muted-foreground)]">
              All fictional examples have been cleared. Fill in your flight costs, transportation, and estimated food budget below to calculate total trip expenses.
            </p>
          </div>

          <!-- Header Actions -->
          <div class="flex items-center gap-2 flex-wrap">
            <button
              @click="resetBudgetInputs"
              class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--background)] hover:bg-[var(--card-hover)] text-rose-700 dark:text-rose-400 border border-[var(--border)] transition-all flex items-center gap-1"
              title="Reset all inputs to zero"
            >
              <span>🔄</span>
              <span>Reset to $0</span>
            </button>
            <button
              @click="printBudgetSummary"
              class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] shadow-sm transition-all flex items-center gap-1.5"
              title="Print budget summary"
            >
              <span>🖨️ Print / PDF</span>
            </button>
          </div>
        </div>

        <!-- 4 Primary Metric Display Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Total Estimated USD -->
          <div class="p-4 rounded-2xl bg-[var(--background)] border-2 border-[var(--accent)]/40 flex flex-col justify-between space-y-1 shadow-sm">
            <div class="flex items-center justify-between text-xs">
              <span class="font-black uppercase text-[10px] tracking-wider text-[var(--accent)]">
                💰 Total Trip Budget
              </span>
              <span class="text-[10px] font-mono text-[var(--muted-foreground)]">Combined USD</span>
            </div>
            <div class="text-3xl font-black text-[var(--foreground)]">
              \${{ Math.round(grandTotalEstimatedUsd).toLocaleString('en-US') }}
            </div>
            <div class="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              ≈ €{{ Math.round(grandTotalEstimatedEur).toLocaleString('en-US') }}
            </div>
          </div>

          <!-- Per-Person Split -->
          <div class="p-4 rounded-2xl bg-purple-500/[0.08] border-2 border-purple-500/30 flex flex-col justify-between space-y-1 shadow-sm">
            <div class="flex items-center justify-between text-xs">
              <span class="font-black uppercase text-[10px] tracking-wider text-purple-700 dark:text-purple-400">
                👥 Fair Share / Person
              </span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-800 dark:text-purple-300 font-bold">
                {{ travelerCount }} Travelers
              </span>
            </div>
            <div class="text-3xl font-black text-purple-800 dark:text-purple-300">
              \${{ Math.round(perPersonEstimatedUsd).toLocaleString('en-US') }}
            </div>
            <div class="text-xs font-bold text-purple-700 dark:text-purple-400">
              ≈ €{{ Math.round(perPersonEstimatedEur).toLocaleString('en-US') }} each
            </div>
          </div>

          <!-- Core Transit & Food Total -->
          <div class="p-4 rounded-2xl bg-amber-500/[0.08] border-2 border-amber-500/30 flex flex-col justify-between space-y-1 shadow-sm">
            <div class="flex items-center justify-between text-xs">
              <span class="font-black uppercase text-[10px] tracking-wider text-amber-700 dark:text-amber-400">
                🚗 Transport + 🍽️ Food
              </span>
              <span class="text-[10px] font-mono text-[var(--muted-foreground)]">On The Ground</span>
            </div>
            <div class="text-2xl font-black text-amber-800 dark:text-amber-300">
              \${{ Math.round(transitTotalUsd + foodTotalUsd).toLocaleString('en-US') }}
            </div>
            <p class="text-[11px] text-[var(--foreground)] font-medium">
              Car: \${{ Math.round(transitTotalUsd) }} · Food: \${{ Math.round(foodTotalUsd) }}
            </p>
          </div>

          <!-- Flights Total -->
          <div class="p-4 rounded-2xl bg-sky-500/[0.08] border-2 border-sky-500/30 flex flex-col justify-between space-y-1 shadow-sm">
            <div class="flex items-center justify-between text-xs">
              <span class="font-black uppercase text-[10px] tracking-wider text-sky-700 dark:text-sky-400">
                ✈️ Total Flight Costs
              </span>
              <span class="text-[10px] font-mono text-[var(--muted-foreground)]">Round-Trip</span>
            </div>
            <div class="text-2xl font-black text-sky-800 dark:text-sky-300">
              \${{ Math.round(flightTotalUsd).toLocaleString('en-US') }}
            </div>
            <p class="text-[11px] text-[var(--foreground)] font-medium">
              \${{ Math.round(flightTotalUsd / travelerCount) }}/person for {{ travelerCount }} travelers
            </p>
          </div>
        </div>

        <!-- Visual Distribution Bar -->
        <div v-if="grandTotalEstimatedUsd > 0" class="space-y-2 pt-2 border-t border-[var(--border)]">
          <div class="flex items-center justify-between text-xs font-bold text-[var(--foreground)]">
            <span>📊 Budget Distribution:</span>
            <span class="text-[11px] font-mono text-[var(--muted-foreground)]">100% of Estimated Trip</span>
          </div>

          <div class="w-full h-3.5 rounded-full bg-[var(--card-hover)] overflow-hidden flex border border-[var(--border)]">
            <div
              v-for="cat in estimatedBreakdown"
              :key="cat.key"
              class="h-full transition-all"
              :style="{ width: cat.pct + '%' }"
              :class="{
                'bg-sky-500': cat.key === 'flights',
                'bg-blue-600': cat.key === 'transit',
                'bg-amber-500': cat.key === 'food',
                'bg-emerald-600': cat.key === 'lodging',
                'bg-purple-600': cat.key === 'activities'
              }"
              :title="cat.label + ': $' + cat.usd + ' (' + cat.pct + '%)'"
            ></div>
          </div>

          <div class="flex items-center gap-3 overflow-x-auto text-[11px] font-bold text-[var(--foreground)] pt-1 flex-wrap">
            <span v-for="cat in estimatedBreakdown" :key="cat.key" class="inline-flex items-center gap-1">
              <span>{{ cat.icon }}</span>
              <span>{{ cat.label }}:</span>
              <span class="font-mono font-black text-[var(--accent)]">\${{ cat.usd.toLocaleString() }} ({{ cat.pct }}%)</span>
            </span>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- CORE BUDGET FORM INPUTS                                 -->
      <!-- ======================================================= -->
      <div class="card p-5 sm:p-6 border-2 border-[var(--border)] bg-[var(--card)] shadow-md space-y-5">
        <div class="border-b border-[var(--border)] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 class="font-black text-base sm:text-lg text-[var(--foreground)] flex items-center gap-2">
              <span>✍️</span>
              <span>Calculate Your Total Trip Expenses</span>
            </h3>
            <p class="text-xs text-[var(--muted-foreground)]">
              Enter amounts in USD (\$) or EUR (€). Calculations update automatically and save locally.
            </p>
          </div>
          <div class="text-[11px] font-mono text-[var(--muted-foreground)] flex items-center gap-2">
            <span>Exchange: €1 = \${{ eurToUsd }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <!-- INPUT 1: FLIGHT COSTS -->
          <div class="p-4 rounded-2xl bg-[var(--background)] border-2 border-sky-500/40 space-y-3 shadow-sm flex flex-col justify-between">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="font-black text-xs uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                  <span>✈️</span>
                  <span>1. Flight Costs</span>
                </label>
                <!-- Mode Toggle: Per-Person vs Total -->
                <div class="flex items-center rounded-lg bg-[var(--card)] p-0.5 border border-[var(--border)] text-[10px]">
                  <button
                    type="button"
                    @click="budgetInputs.flightMode = 'per_person'; saveBudgetInputs()"
                    :class="['px-2 py-0.5 rounded font-bold transition-all', budgetInputs.flightMode === 'per_person' ? 'bg-sky-600 text-white shadow-sm' : 'text-[var(--muted-foreground)]']"
                  >
                    / Person
                  </button>
                  <button
                    type="button"
                    @click="budgetInputs.flightMode = 'total'; saveBudgetInputs()"
                    :class="['px-2 py-0.5 rounded font-bold transition-all', budgetInputs.flightMode === 'total' ? 'bg-sky-600 text-white shadow-sm' : 'text-[var(--muted-foreground)]']"
                  >
                    Total
                  </button>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <select
                  v-model="budgetInputs.flightCurrency"
                  @change="saveBudgetInputs"
                  class="p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] font-bold text-xs text-[var(--foreground)]"
                >
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                </select>

                <input
                  v-model.number="budgetInputs.flightCost"
                  @input="saveBudgetInputs"
                  type="number"
                  step="any"
                  min="0"
                  :placeholder="budgetInputs.flightMode === 'per_person' ? 'e.g. 850 per person' : 'e.g. 3400 total'"
                  class="w-full p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] font-mono font-bold text-sm text-[var(--foreground)] focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <p class="text-[11px] text-[var(--muted-foreground)] leading-tight">
                {{ budgetInputs.flightMode === 'per_person' ? 'Multiplies by ' + travelerCount + ' travelers: ' + familyMembers.join(', ') : 'Total flight cost for all travelers combined' }}
              </p>
            </div>

            <div class="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs font-bold">
              <span class="text-[var(--muted-foreground)]">Flight Subtotal:</span>
              <span class="font-mono text-sky-700 dark:text-sky-400 font-black">\${{ Math.round(flightTotalUsd).toLocaleString() }}</span>
            </div>
          </div>

          <!-- INPUT 2: TRANSPORTATION (RENTAL CAR, DIESEL, TOLLS) -->
          <div class="p-4 rounded-2xl bg-[var(--background)] border-2 border-blue-500/40 space-y-3 shadow-sm flex flex-col justify-between">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="font-black text-xs uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <span>🚗</span>
                  <span>2. Transportation</span>
                </label>
                <select
                  v-model="budgetInputs.transitCurrency"
                  @change="saveBudgetInputs"
                  class="p-1 px-2 rounded-lg bg-[var(--card)] border border-[var(--border)] font-bold text-[10px] text-[var(--foreground)]"
                >
                  <option value="EUR">€ EUR</option>
                  <option value="USD">$ USD</option>
                </select>
              </div>

              <input
                v-model.number="budgetInputs.transitCost"
                @input="saveBudgetInputs"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 950 (Car + fuel + tolls)"
                class="w-full p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] font-mono font-bold text-sm text-[var(--foreground)] focus:ring-2 focus:ring-blue-500"
              />

              <p class="text-[11px] text-[var(--muted-foreground)] leading-tight">
                Rental 7-Seater/SUV, diesel fuel fill-ups (~€250), M50 barrier-free eFlow & M1 motorway tolls.
              </p>
            </div>

            <div class="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs font-bold">
              <span class="text-[var(--muted-foreground)]">Transit Subtotal:</span>
              <span class="font-mono text-blue-700 dark:text-blue-400 font-black">
                {{ budgetInputs.transitCurrency === 'EUR' ? '€' + (budgetInputs.transitCost || 0) + ' (~$' + Math.round(transitTotalUsd) + ')' : '$' + Math.round(transitTotalUsd) }}
              </span>
            </div>
          </div>

          <!-- INPUT 3: ESTIMATED FOOD & DINING BUDGET -->
          <div class="p-4 rounded-2xl bg-[var(--background)] border-2 border-amber-500/40 space-y-3 shadow-sm flex flex-col justify-between">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="font-black text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span>🍽️</span>
                  <span>3. Estimated Food Budget</span>
                </label>
                <!-- Mode Toggle: Per-Day vs Total -->
                <div class="flex items-center rounded-lg bg-[var(--card)] p-0.5 border border-[var(--border)] text-[10px]">
                  <button
                    type="button"
                    @click="budgetInputs.foodMode = 'per_day'; saveBudgetInputs()"
                    :class="['px-2 py-0.5 rounded font-extrabold transition-all', budgetInputs.foodMode === 'per_day' ? 'bg-amber-400 text-black shadow-sm' : 'text-[var(--muted-foreground)]']"
                  >
                    / Day
                  </button>
                  <button
                    type="button"
                    @click="budgetInputs.foodMode = 'total'; saveBudgetInputs()"
                    :class="['px-2 py-0.5 rounded font-extrabold transition-all', budgetInputs.foodMode === 'total' ? 'bg-amber-400 text-black shadow-sm' : 'text-[var(--muted-foreground)]']"
                  >
                    Total
                  </button>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <select
                  v-model="budgetInputs.foodCurrency"
                  @change="saveBudgetInputs"
                  class="p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] font-bold text-xs text-[var(--foreground)]"
                >
                  <option value="EUR">€ EUR</option>
                  <option value="USD">$ USD</option>
                </select>

                <input
                  v-model.number="budgetInputs.foodCost"
                  @input="saveBudgetInputs"
                  type="number"
                  step="any"
                  min="0"
                  :placeholder="budgetInputs.foodMode === 'per_day' ? 'e.g. 55 / person / day' : 'e.g. 2800 total dining'"
                  class="w-full p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] font-mono font-bold text-sm text-[var(--foreground)] focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <p class="text-[11px] text-[var(--muted-foreground)] leading-tight">
                {{ budgetInputs.foodMode === 'per_day' ? 'Calculates €' + (budgetInputs.foodCost || 0) + ' × 13 days × ' + travelerCount + ' travelers across Dublin, Galway & Kerry' : 'Total food, pub rounds, groceries, and dining budget' }}
              </p>
            </div>

            <div class="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs font-bold">
              <span class="text-[var(--muted-foreground)]">Food Subtotal:</span>
              <span class="font-mono text-amber-700 dark:text-amber-400 font-black">\${{ Math.round(foodTotalUsd).toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <!-- OPTIONAL INPUTS: LODGING & ACTIVITIES / TRINKETS -->
        <div class="pt-3 border-t border-[var(--border)] space-y-3">
          <div class="flex items-center justify-between text-xs font-bold text-[var(--foreground)]">
            <span class="flex items-center gap-1.5">
              <span>➕</span>
              <span>Optional Additional Buckets (Lodging &amp; Activities / Shopping):</span>
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Optional Lodging Input -->
            <div class="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-2">
              <div class="flex items-center justify-between text-xs font-bold">
                <span class="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span>🏨</span>
                  <span>Lodging / Stays (Total Airbnb &amp; Hotels):</span>
                </span>
                <span class="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">\${{ Math.round(lodgingTotalUsd) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <select
                  v-model="budgetInputs.lodgingCurrency"
                  @change="saveBudgetInputs"
                  class="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] font-bold text-xs"
                >
                  <option value="EUR">€ EUR</option>
                  <option value="USD">$ USD</option>
                </select>
                <input
                  v-model.number="budgetInputs.lodgingCost"
                  @input="saveBudgetInputs"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. Total booked accommodations"
                  class="w-full p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] font-mono text-xs font-bold"
                />
              </div>
            </div>

            <!-- Optional Activities & Shopping Trinkets Input -->
            <div class="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-2">
              <div class="flex items-center justify-between text-xs font-bold">
                <span class="text-purple-700 dark:text-purple-400 flex items-center gap-1">
                  <span>🛍️</span>
                  <span>Activities, Tours &amp; Shopping Trinkets:</span>
                </span>
                <span class="text-[11px] font-mono text-purple-700 dark:text-purple-400">\${{ Math.round(activitiesTotalUsd) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <select
                  v-model="budgetInputs.activitiesCurrency"
                  @change="saveBudgetInputs"
                  class="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] font-bold text-xs"
                >
                  <option value="EUR">€ EUR</option>
                  <option value="USD">$ USD</option>
                </select>
                <input
                  v-model.number="budgetInputs.activitiesCost"
                  @input="saveBudgetInputs"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. Tours, passes, gifts, piano/art shopping"
                  class="w-full p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] font-mono text-xs font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- ON-THE-ROAD LOGGED EXPENSE LEDGER (CLEAN SLATE)         -->
      <!-- ======================================================= -->
      <div class="card p-5 border border-[var(--border)] bg-[var(--card)] shadow-md space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xl">🧾</span>
              <h3 class="font-extrabold text-sm sm:text-base text-[var(--foreground)]">
                On-The-Road Expense Ledger &amp; Receipts
              </h3>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--muted)] text-[var(--foreground)]">
                {{ allExpenses.length }} Logged
              </span>
            </div>
            <p class="text-xs text-[var(--muted-foreground)]">
              Log actual receipts during the trip to track spending against your estimated budget and calculate who owes whom.
            </p>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button
              @click="showAddForm = !showAddForm"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] hover:opacity-90 text-white shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>{{ showAddForm ? '✕ Close Form' : '➕ Log Receipt' }}</span>
            </button>
            <button
              v-if="allExpenses.length > 0"
              @click="exportCsv"
              class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] shadow-sm transition-all flex items-center gap-1"
            >
              <span>📥 Export CSV</span>
            </button>
            <button
              v-if="allExpenses.length > 0"
              @click="clearAllCustomExpenses"
              class="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 transition-all"
              title="Clear all logged items"
            >
              <span>🗑️ Clear</span>
            </button>
          </div>
        </div>

        <!-- Add Expense Form -->
        <div v-if="showAddForm" class="p-4 rounded-2xl border-2 border-[var(--accent)] bg-[var(--background)] shadow-inner space-y-3 animate-fadeIn">
          <div class="flex items-center justify-between border-b border-[var(--border)] pb-2 text-xs font-bold">
            <span>📝 Log a Real Purchase / Receipt</span>
            <button @click="showAddForm = false" class="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">✕</button>
          </div>

          <form @submit.prevent="submitExpense" class="space-y-3 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2 space-y-1">
                <label class="font-bold text-[var(--foreground)]">Description / Where</label>
                <input
                  v-model="newExpense.title"
                  type="text"
                  placeholder="e.g. Lunch @ The Hairy Lemon, Cliffs Parking, Tesco groceries..."
                  required
                  class="w-full p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]"
                />
              </div>

              <div class="space-y-1">
                <label class="font-bold text-[var(--foreground)]">Category</label>
                <select
                  v-model="newExpense.category"
                  class="w-full p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] font-bold text-[var(--foreground)]"
                >
                  <option value="Dining">🍽️ Dining &amp; Pubs</option>
                  <option value="Transit">🚗 Transit &amp; Fuel</option>
                  <option value="Lodging">🏨 Lodging</option>
                  <option value="Activities">🎟️ Activities &amp; Tours</option>
                  <option value="Shopping">🛍️ Shopping &amp; Trinkets</option>
                  <option value="Misc">📦 Misc</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="space-y-1">
                <label class="font-bold text-[var(--foreground)]">Currency &amp; Amount</label>
                <div class="flex items-center gap-1.5">
                  <select
                    v-model="newExpense.currency"
                    class="p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] font-bold text-[var(--foreground)]"
                  >
                    <option value="EUR">€ EUR</option>
                    <option value="GBP">£ GBP</option>
                    <option value="USD">$ USD</option>
                  </select>
                  <input
                    v-model.number="newExpense.amount"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    required
                    class="w-full p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] font-mono font-bold text-sm text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div class="space-y-1">
                <label class="font-bold text-[var(--foreground)]">Who Paid?</label>
                <select
                  v-model="newExpense.payer"
                  class="w-full p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] font-bold text-[var(--foreground)]"
                >
                  <option v-for="m in familyMembers" :key="m" :value="m">{{ m }}</option>
                  <option value="Split">Split Evenly</option>
                </select>
              </div>

              <div class="space-y-1">
                <label class="font-bold text-[var(--foreground)]">Notes (Optional)</label>
                <input
                  v-model="newExpense.notes"
                  type="text"
                  placeholder="Receipt note or details"
                  class="w-full p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]"
                />
              </div>
            </div>

            <div class="space-y-1.5 pt-1">
              <label class="font-bold text-[var(--foreground)]">Split Between:</label>
              <div class="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  v-for="m in familyMembers"
                  :key="m"
                  @click="toggleSplitMember(m)"
                  :class="[
                    'px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                    newExpense.splitWith.includes(m)
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]'
                  ]"
                >
                  {{ newExpense.splitWith.includes(m) ? '✓ ' + m : '+ ' + m }}
                </button>
                <button
                  type="button"
                  @click="selectAllSplitMembers"
                  class="text-[11px] text-[var(--accent)] underline ml-2"
                >
                  Select All
                </button>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                @click="showAddForm = false"
                class="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--muted-foreground)] hover:bg-[var(--card)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-1.5 rounded-xl text-xs font-black bg-[var(--accent)] text-white shadow-md hover:opacity-90"
              >
                Save Receipt
              </button>
            </div>
          </form>
        </div>

        <!-- Ledger Table or Empty State -->
        <div v-if="allExpenses.length === 0" class="text-center py-8 space-y-2 border-2 border-dashed border-[var(--border)] rounded-2xl">
          <span class="text-3xl">🧾</span>
          <div class="font-bold text-sm text-[var(--foreground)]">No individual receipts logged yet</div>
          <p class="text-xs text-[var(--muted-foreground)] max-w-md mx-auto">
            Your ledger starts with a clean slate. Tap "➕ Log Receipt" when you want to track actual purchases or settle dinner tabs during the trip!
          </p>
        </div>

        <!-- Table of Logged Expenses -->
        <div v-else class="overflow-x-auto space-y-2">
          <div class="flex items-center justify-between text-xs text-[var(--muted-foreground)] pb-1">
            <span>Showing {{ filteredExpenses.length }} of {{ allExpenses.length }} receipts</span>
            <span class="font-bold text-[var(--foreground)] font-mono">
              Total Logged: \${{ Math.round(actualSpentUsdEquivalent).toLocaleString() }}
            </span>
          </div>

          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-[var(--border)] text-[var(--muted-foreground)] text-[11px] uppercase font-bold">
                <th class="py-2 px-2">Item</th>
                <th class="py-2 px-2">Category</th>
                <th class="py-2 px-2">Payer</th>
                <th class="py-2 px-2 text-right">Amount</th>
                <th class="py-2 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="e in filteredExpenses"
                :key="e.id"
                class="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors"
              >
                <td class="py-2.5 px-2 font-bold text-[var(--foreground)]">
                  <div>{{ e.title }}</div>
                  <div v-if="e.notes" class="text-[11px] font-normal text-[var(--muted-foreground)]">{{ e.notes }}</div>
                </td>
                <td class="py-2.5 px-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--muted)] text-[var(--foreground)]">
                    {{ e.category }}
                  </span>
                </td>
                <td class="py-2.5 px-2 font-medium text-[var(--foreground)]">
                  {{ e.payer }}
                </td>
                <td class="py-2.5 px-2 text-right font-mono font-bold text-[var(--foreground)]">
                  {{ e.currency === 'GBP' ? '£' : (e.currency === 'USD' ? '$' : '€') }}{{ e.amount }}
                </td>
                <td class="py-2.5 px-2 text-center">
                  <button
                    @click="deleteExpense(e.id)"
                    class="text-rose-700 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 font-bold px-1 transition-transform hover:scale-110"
                    title="Delete expense"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Settlement Summary (Who Owes Whom) -->
        <div v-if="allExpenses.length > 0 && settlementSteps.length > 0" class="p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] space-y-2.5">
          <h4 class="font-extrabold text-xs uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1.5">
            <span>🤝</span>
            <span>Fair-Share Settlement (Who Owes Whom):</span>
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="(step, sIdx) in settlementSteps"
              :key="sIdx"
              class="p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-between text-xs"
            >
              <div class="font-bold text-[var(--foreground)]">
                <span class="text-rose-700 dark:text-rose-400">{{ step.from }}</span>
                <span class="text-[var(--muted-foreground)] font-normal"> owes </span>
                <span class="text-emerald-700 dark:text-emerald-400">{{ step.to }}</span>
              </div>
              <div class="font-mono font-black text-[var(--accent)]">
                \${{ step.amountUsd }} (~€{{ step.amountEur }})
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
};
