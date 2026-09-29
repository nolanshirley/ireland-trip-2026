// =============================================================
//  Component: BudgetTracker & Family Expense Settlement Hub
//  (Multi-Currency EUR/GBP/USD, Who Paid vs Who Owes, Tipping Guide)
// =============================================================

const BudgetTracker = {
  name: 'BudgetTracker',
  props: {
    baseExpenses: { type: Array, default: () => [] }
  },
  data() {
    return {
      customExpenses: [],
      familyMembers: ['Dad', 'Mom', 'Erin', 'Noland'],
      newMemberName: '',
      activeCategoryFilter: 'all', // 'all', 'Lodging', 'Transit', 'Dining', 'Activities', 'Misc'
      activeCurrencyFilter: 'all', // 'all', 'EUR', 'GBP'
      activePayerFilter: 'all', // 'all', or member name
      searchQuery: '',
      showAddForm: false,
      showTippingGuide: true,
      eurToUsd: 1.08,
      gbpToUsd: 1.30,
      newExpense: {
        title: '',
        category: 'Dining',
        currency: 'EUR',
        amount: '',
        payer: 'Dad',
        splitWith: ['Dad', 'Mom', 'Erin', 'Noland'],
        isPrepaid: false,
        notes: ''
      }
    };
  },
  created() {
    this.loadStorage();
  },
  computed: {
    allExpenses() {
      const base = (this.baseExpenses && this.baseExpenses.length > 0)
        ? this.baseExpenses
        : (typeof tripExpenseData !== 'undefined' ? tripExpenseData : []);
      return [...base, ...this.customExpenses];
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
    totalEur() {
      return this.allExpenses
        .filter(e => e.currency === 'EUR' || !e.currency)
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    },
    totalGbp() {
      return this.allExpenses
        .filter(e => e.currency === 'GBP')
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    },
    totalUsdEquivalent() {
      return (this.totalEur * this.eurToUsd) + (this.totalGbp * this.gbpToUsd);
    },
    prepaidTotals() {
      let eur = 0;
      let gbp = 0;
      this.allExpenses.forEach(e => {
        if (e.isPrepaid || e.category === 'Lodging' || (e.title && e.title.includes('Retreat')) || (e.title && e.title.includes('Villa')) || (e.title && e.title.includes('Rental'))) {
          const amt = parseFloat(e.amount) || 0;
          if (e.currency === 'GBP') gbp += amt;
          else eur += amt;
        }
      });
      return { eur, gbp, usd: (eur * this.eurToUsd) + (gbp * this.gbpToUsd) };
    },
    onTheRoadTotals() {
      const eur = Math.max(0, this.totalEur - this.prepaidTotals.eur);
      const gbp = Math.max(0, this.totalGbp - this.prepaidTotals.gbp);
      return { eur, gbp, usd: (eur * this.eurToUsd) + (gbp * this.gbpToUsd) };
    },
    categoryBreakdown() {
      const categories = ['Lodging', 'Transit', 'Dining', 'Activities', 'Misc'];
      const icons = {
        'Lodging': '🏨',
        'Transit': '🚗',
        'Dining': '🍽️',
        'Activities': '🎟️',
        'Misc': '🛍️'
      };
      const totalCombinedUsd = this.totalUsdEquivalent || 1;

      return categories.map(cat => {
        let eur = 0;
        let gbp = 0;
        let count = 0;
        this.allExpenses.forEach(e => {
          const itemCat = e.category || 'Misc';
          if (itemCat === cat || (cat === 'Misc' && !categories.includes(itemCat))) {
            const amt = parseFloat(e.amount) || 0;
            if (e.currency === 'GBP') gbp += amt;
            else eur += amt;
            count++;
          }
        });
        const usd = (eur * this.eurToUsd) + (gbp * this.gbpToUsd);
        const percent = Math.min(100, Math.round((usd / totalCombinedUsd) * 100));
        return {
          name: cat,
          icon: icons[cat] || '📦',
          eur,
          gbp,
          usd: Math.round(usd),
          percent,
          count
        };
      });
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
        const usd = e.currency === 'GBP' ? amt * this.gbpToUsd : amt * this.eurToUsd;
        
        // Payer
        const payer = e.payer;
        if (balances[payer]) {
          balances[payer].paidUsd += usd;
        } else {
          // If split/family, distribute payment evenly
          members.forEach(m => {
            balances[m].paidUsd += usd / count;
          });
        }

        // Beneficiaries
        const beneficiaries = (Array.isArray(e.splitWith) && e.splitWith.length > 0)
          ? e.splitWith.filter(m => balances[m])
          : members;
        const bCount = Math.max(1, beneficiaries.length);
        beneficiaries.forEach(m => {
          balances[m].shareUsd += usd / bCount;
        });
      });

      // Calculate net balances
      Object.values(balances).forEach(b => {
        b.netUsd = Math.round(b.paidUsd - b.shareUsd);
        b.paidUsd = Math.round(b.paidUsd);
        b.shareUsd = Math.round(b.shareUsd);
      });

      return Object.values(balances);
    },
    settlementSteps() {
      // Simplified peer-to-peer settlement calculation
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
        const savedExpenses = localStorage.getItem('ireland_custom_expenses');
        if (savedExpenses) this.customExpenses = JSON.parse(savedExpenses);
        
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
      }
    },
    removeFamilyMember(name) {
      if (this.familyMembers.length <= 1) {
        alert('Keep at least 1 traveler in your party.');
        return;
      }
      this.familyMembers = this.familyMembers.filter(m => m !== name);
      this.saveMembers();
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
        isPrepaid: Boolean(this.newExpense.isPrepaid),
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
      if (confirm('Remove this expense item?')) {
        this.customExpenses = this.customExpenses.filter(e => e.id !== id);
        this.saveExpenses();
        if (window.TravelApp && window.TravelApp.notify) {
          window.TravelApp.notify('Expense removed from ledger', '🗑️');
        }
      }
    },
    quickAddPreset(title, category, currency, amount, payer) {
      const exp = {
        id: 'exp_' + Date.now(),
        title,
        category,
        currency,
        amount,
        payer: payer || this.familyMembers[0] || 'Dad',
        splitWith: [...this.familyMembers],
        isPrepaid: false,
        notes: 'Quick preset entry',
        createdAt: new Date().toISOString(),
        isCustom: true
      };
      this.customExpenses.unshift(exp);
      this.saveExpenses();
      if (window.TravelApp && window.TravelApp.notify) {
        const sym = currency === 'GBP' ? '£' : (currency === 'USD' ? '$' : '€');
        window.TravelApp.notify(`Logged preset: ${title} (${sym}${amount})`, '💶');
      }
    },
    printBudgetSummary() {
      window.print();
    }
  },
  template: `
    <div class="space-y-6">
      
      <!-- Top Overview Banner -->
      <div class="card p-5 sm:p-6 border-2 border-[var(--accent)]/30 bg-[var(--card)] shadow-lg space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-2xl">💶</span>
              <h2 class="text-xl sm:text-2xl font-black text-[var(--foreground)] tracking-tight">
                Trip Budget & Family Expense Hub
              </h2>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Multi-Currency
              </span>
            </div>
            <p class="text-xs text-[var(--muted-foreground)]">
              Real-time aggregation across the Republic (€ EUR), Northern Ireland (£ GBP), fair-share splits, and settlement balances.
            </p>
          </div>

          <!-- Header Actions -->
          <div class="flex items-center gap-2 flex-wrap">
            <button
              @click="showAddForm = !showAddForm"
              class="px-4 py-2 rounded-xl text-xs font-extrabold bg-[var(--accent)] hover:opacity-90 text-white shadow-md transition-all flex items-center gap-1.5"
            >
              <span>{{ showAddForm ? '✕ Close Form' : '➕ Add Expense' }}</span>
            </button>
            <button
              @click="printBudgetSummary"
              class="px-3 py-2 rounded-xl text-xs font-bold bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] shadow-sm transition-all flex items-center gap-1.5"
              title="Print budget summary"
            >
              <span>🖨️ Print / PDF</span>
            </button>
          </div>
        </div>

        <!-- 4 Primary Metric Aggregations -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Republic of Ireland Euros -->
          <div class="p-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/25 flex flex-col justify-between space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="font-extrabold uppercase text-[10px] tracking-wider text-emerald-500 dark:text-emerald-400">
                🇮🇪 Republic of Ireland
              </span>
              <span class="text-[10px] font-mono text-[var(--muted-foreground)]">Bases 2, 3, 4</span>
            </div>
            <div class="text-2xl sm:text-3xl font-black text-emerald-500 dark:text-emerald-400">
              €{{ totalEur.toLocaleString('en-US', { maximumFractionDigits: 0 }) }}
            </div>
            <p class="text-[11px] text-[var(--muted-foreground)]">
              Galway, Kerry, Connemara & Dublin
            </p>
          </div>

          <!-- Northern Ireland British Pounds -->
          <div class="p-3.5 rounded-2xl bg-blue-500/[0.08] border border-blue-500/25 flex flex-col justify-between space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="font-extrabold uppercase text-[10px] tracking-wider text-blue-500 dark:text-blue-400">
                🇬🇧 Northern Ireland
              </span>
              <span class="text-[10px] font-mono text-[var(--muted-foreground)]">Base 1 (Newry)</span>
            </div>
            <div class="text-2xl sm:text-3xl font-black text-blue-500 dark:text-blue-400">
              £{{ totalGbp.toLocaleString('en-US', { maximumFractionDigits: 0 }) }}
            </div>
            <p class="text-[11px] text-[var(--muted-foreground)]">
              Belfast Titanic, Giant's Causeway & Antrim
            </p>
          </div>

          <!-- Combined Total USD Reference -->
          <div class="p-3.5 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex flex-col justify-between space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="font-extrabold uppercase text-[10px] tracking-wider text-[var(--muted-foreground)]">
                🇺🇸 Est. Total USD
              </span>
              <span class="text-[10px] font-mono text-[var(--muted-foreground)]">Combined</span>
            </div>
            <div class="text-2xl sm:text-3xl font-black text-[var(--foreground)]">
              \${{ Math.round(totalUsdEquivalent).toLocaleString('en-US') }}
            </div>
            <div class="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
              <span>€1 = \${{ eurToUsd }}</span>
              <span>·</span>
              <span>£1 = \${{ gbpToUsd }}</span>
            </div>
          </div>

          <!-- Per-Person Split -->
          <div class="p-3.5 rounded-2xl bg-purple-500/[0.08] border border-purple-500/25 flex flex-col justify-between space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="font-extrabold uppercase text-[10px] tracking-wider text-purple-400">
                👥 Fair Share / Person
              </span>
              <span class="text-[10px] font-mono text-purple-300 font-bold">{{ familyMembers.length }} Travelers</span>
            </div>
            <div class="text-xl sm:text-2xl font-black text-purple-300">
              \${{ Math.round(totalUsdEquivalent / familyMembers.length).toLocaleString('en-US') }}
            </div>
            <p class="text-[11px] text-[var(--muted-foreground)]">
              ~€{{ Math.round(totalEur / familyMembers.length) }} + £{{ Math.round(totalGbp / familyMembers.length) }} each
            </p>
          </div>
        </div>

        <!-- Pre-Paid vs On-The-Road Reality Bar -->
        <div class="p-3.5 rounded-2xl bg-[var(--background)] border border-[var(--border)] space-y-2">
          <div class="flex items-center justify-between text-xs font-bold">
            <span class="flex items-center gap-1.5 text-[var(--foreground)]">
              <span>💳</span>
              <span>Pre-Booked vs. On-The-Road Spending:</span>
            </span>
            <span class="text-[11px] text-[var(--muted-foreground)]">
              Pre-Paid: <strong>\${{ Math.round(prepaidTotals.usd) }}</strong> ({{ Math.round((prepaidTotals.usd / (totalUsdEquivalent || 1)) * 100) }}%) · 
              On The Road: <strong>\${{ Math.round(onTheRoadTotals.usd) }}</strong>
            </span>
          </div>

          <div class="w-full h-3 rounded-full bg-[var(--card-hover)] overflow-hidden flex">
            <div
              class="h-full bg-emerald-500 transition-all"
              :style="{ width: Math.round((prepaidTotals.usd / (totalUsdEquivalent || 1)) * 100) + '%' }"
              title="Pre-Booked: Hotels, rental car, reserved tours"
            ></div>
            <div
              class="h-full bg-amber-500 transition-all flex-1"
              title="On The Road: Dinners, pub rounds, gas, tolls"
            ></div>
          </div>

          <div class="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] font-mono">
            <span class="text-emerald-400 font-bold">● Pre-Booked (Hotels & Car): €{{ prepaidTotals.eur }} + £{{ prepaidTotals.gbp }}</span>
            <span class="text-amber-400 font-bold">● On The Road (Dinners, Pubs, Gas): €{{ onTheRoadTotals.eur }} + £{{ onTheRoadTotals.gbp }}</span>
          </div>
        </div>
      </div>

      <!-- Quick 1-Tap Expense Presets Bar -->
      <div class="card p-3 sm:p-4 border border-[var(--border)] space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1">
            <span>⚡ Fast 1-Tap Add Presets:</span>
          </span>
          <span class="text-[10px] text-[var(--muted-foreground)]">Quickly log on-the-road purchases</span>
        </div>
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            @click="quickAddPreset('Pub Round & Pints', 'Dining', 'EUR', 40, familyMembers[0])"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 whitespace-nowrap transition-all shadow-sm flex items-center gap-1"
          >
            <span>🍺</span>
            <span>+ €40 Pub Round</span>
          </button>

          <button
            @click="quickAddPreset('Diesel / Petrol Refill', 'Transit', 'EUR', 75, familyMembers[0])"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30 whitespace-nowrap transition-all shadow-sm flex items-center gap-1"
          >
            <span>⛽</span>
            <span>+ €75 Fuel Tank</span>
          </button>

          <button
            @click="quickAddPreset('M50 eFlow Toll / Parking', 'Transit', 'EUR', 20, familyMembers[0])"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 whitespace-nowrap transition-all shadow-sm flex items-center gap-1"
          >
            <span>🅿️</span>
            <span>+ €20 Toll/Park</span>
          </button>

          <button
            @click="quickAddPreset('Coffee & Bakery Morning', 'Dining', 'EUR', 24, familyMembers[0])"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 whitespace-nowrap transition-all shadow-sm flex items-center gap-1"
          >
            <span>🥐</span>
            <span>+ €24 Breakfast</span>
          </button>

          <button
            @click="quickAddPreset('Seated Pub / Restaurant Dinner', 'Dining', 'EUR', 160, familyMembers[0])"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 whitespace-nowrap transition-all shadow-sm flex items-center gap-1"
          >
            <span>🍽️</span>
            <span>+ €160 Dinner</span>
          </button>
        </div>
      </div>

      <!-- Add Expense Form (Expandable / Inline) -->
      <div v-if="showAddForm" class="card p-5 border-2 border-[var(--accent)] bg-[var(--card)] shadow-xl space-y-4 animate-fadeIn">
        <div class="flex items-center justify-between border-b border-[var(--border)] pb-2">
          <h3 class="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-2">
            <span>📝</span>
            <span>Log a New Trip Expense</span>
          </h3>
          <button @click="showAddForm = false" class="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-bold">
            ✕ Close
          </button>
        </div>

        <form @submit.prevent="submitExpense" class="space-y-3.5 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="sm:col-span-2 space-y-1">
              <label class="font-bold text-[var(--foreground)]">Expense Description / Title</label>
              <input
                v-model="newExpense.title"
                type="text"
                placeholder="e.g. Seafood Dinner @ Ruibin, Cliffs Parking, Ferry Pass..."
                required
                class="w-full p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <div class="space-y-1">
              <label class="font-bold text-[var(--foreground)]">Category</label>
              <select
                v-model="newExpense.category"
                class="w-full p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-semibold"
              >
                <option value="Dining">🍽️ Dining & Pubs</option>
                <option value="Transit">🚗 Transit & Car</option>
                <option value="Lodging">🏨 Lodging</option>
                <option value="Activities">🎟️ Activities & Tours</option>
                <option value="Misc">🛍️ Sundries / Misc</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="space-y-1">
              <label class="font-bold text-[var(--foreground)]">Currency & Amount</label>
              <div class="flex items-center gap-1.5">
                <select
                  v-model="newExpense.currency"
                  class="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] font-bold text-[var(--foreground)]"
                >
                  <option value="EUR">€ EUR</option>
                  <option value="GBP">£ GBP</option>
                </select>
                <input
                  v-model.number="newExpense.amount"
                  type="number"
                  placeholder="0.00"
                  step="any"
                  min="0"
                  required
                  class="w-full p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] font-mono font-bold text-sm text-[var(--foreground)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
            </div>

            <div class="space-y-1">
              <label class="font-bold text-[var(--foreground)]">Who Paid?</label>
              <select
                v-model="newExpense.payer"
                class="w-full p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-semibold"
              >
                <option v-for="m in familyMembers" :key="m" :value="m">{{ m }}</option>
                <option value="Split">Family Split (Evenly)</option>
              </select>
            </div>

            <div class="space-y-1 flex flex-col justify-end">
              <label class="flex items-center gap-2 p-2 rounded-xl bg-[var(--background)] border border-[var(--border)] cursor-pointer">
                <input type="checkbox" v-model="newExpense.isPrepaid" class="rounded text-[var(--accent)]" />
                <span class="text-xs font-semibold text-[var(--foreground)]">Already Pre-Paid?</span>
              </label>
            </div>
          </div>

          <!-- Who splits this expense? -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="font-bold text-[var(--foreground)]">Split Amongst (Who participates?):</label>
              <button
                type="button"
                @click="selectAllSplitMembers"
                class="text-[11px] text-[var(--accent)] underline font-semibold"
              >
                Select All Family
              </button>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                v-for="m in familyMembers"
                :key="m"
                @click="toggleSplitMember(m)"
                :class="[
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1',
                  newExpense.splitWith.includes(m)
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                    : 'bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]'
                ]"
              >
                <span>{{ newExpense.splitWith.includes(m) ? '✓' : '+' }}</span>
                <span>{{ m }}</span>
              </button>
            </div>
          </div>

          <div class="space-y-1">
            <label class="font-bold text-[var(--foreground)]">Notes / Receipt Ref</label>
            <input
              v-model="newExpense.notes"
              type="text"
              placeholder="e.g. Split with Dad, card receipt in glovebox..."
              class="w-full p-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)]"
            />
          </div>

          <div class="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="showAddForm = false"
              class="px-4 py-2 rounded-xl bg-[var(--card-hover)] text-[var(--muted-foreground)] font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-6 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-black shadow-md transition-all"
            >
              Save Expense Item
            </button>
          </div>
        </form>
      </div>

      <!-- Who Paid vs Who Owes Settlement Matrix -->
      <div class="card p-5 border border-[var(--border)] space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="text-xl">🤝</span>
              <h3 class="font-extrabold text-base text-[var(--foreground)]">
                Family Balances & Settlement ("Who Pays Whom")
              </h3>
            </div>
            <p class="text-xs text-[var(--muted-foreground)]">
              Calculates total paid vs. fair share per person so nobody gets stuck holding the bill.
            </p>
          </div>

          <!-- Edit Members Control -->
          <div class="flex items-center gap-1.5 self-start sm:self-auto">
            <input
              v-model="newMemberName"
              @keyup.enter="addFamilyMember"
              type="text"
              placeholder="Add person..."
              class="px-2.5 py-1 text-xs rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] w-28"
            />
            <button
              @click="addFamilyMember"
              class="px-2.5 py-1 text-xs font-bold rounded-lg bg-[var(--accent)] text-white hover:opacity-90"
            >
              + Add
            </button>
          </div>
        </div>

        <!-- Member Balances Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            v-for="b in memberBalances"
            :key="b.name"
            class="p-3.5 rounded-2xl border bg-[var(--background)] space-y-2 flex flex-col justify-between"
            :class="[
              b.netUsd > 10 ? 'border-emerald-500/40 bg-emerald-500/[0.03]' : (b.netUsd < -10 ? 'border-amber-500/40 bg-amber-500/[0.03]' : 'border-[var(--border)]')
            ]"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="text-base font-extrabold text-[var(--foreground)]">{{ b.name }}</span>
                <button
                  v-if="familyMembers.length > 2"
                  @click="removeFamilyMember(b.name)"
                  class="text-[10px] text-rose-400 hover:text-rose-300 font-bold px-1"
                  title="Remove person"
                >
                  ✕
                </button>
              </div>
              <span
                :class="[
                  'px-2 py-0.5 rounded text-[10px] font-extrabold shadow-sm',
                  b.netUsd > 1 ? 'bg-emerald-200 dark:bg-emerald-300 text-emerald-950 border border-emerald-400' :
                  (b.netUsd < -1 ? 'bg-amber-200 dark:bg-amber-300 text-amber-950 border border-amber-400' : 'bg-slate-200 text-slate-800')
                ]"
              >
                {{ b.netUsd > 1 ? '+\$' + b.netUsd + ' (Gets Back)' : (b.netUsd < -1 ? '-\$' + Math.abs(b.netUsd) + ' (Owes)' : 'Settled up') }}
              </span>
            </div>

            <div class="space-y-1 text-xs">
              <div class="flex justify-between text-[var(--muted-foreground)]">
                <span>Total Paid:</span>
                <strong class="text-[var(--foreground)]">\${{ b.paidUsd }}</strong>
              </div>
              <div class="flex justify-between text-[var(--muted-foreground)]">
                <span>Fair Share:</span>
                <span class="text-[var(--foreground)]">\${{ b.shareUsd }}</span>
              </div>
            </div>

            <!-- Net Balance Highlight -->
            <div class="pt-2 border-t border-[var(--border)] text-center font-mono font-bold text-xs">
              <span :class="b.netUsd >= 0 ? 'text-emerald-400' : 'text-amber-400'">
                {{ b.netUsd >= 0 ? 'Balance: +\$' + b.netUsd : 'Balance: -\$' + Math.abs(b.netUsd) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Clear Settlement Instructions -->
        <div v-if="settlementSteps.length > 0" class="p-4 rounded-2xl bg-indigo-500/[0.08] border border-indigo-500/25 space-y-2">
          <div class="flex items-center gap-2 text-indigo-400 font-bold text-xs">
            <span>✨</span>
            <h4>Fastest Way to Settle Balances ({{ settlementSteps.length }} {{ settlementSteps.length === 1 ? 'transfer' : 'transfers' }}):</h4>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div
              v-for="(step, sIdx) in settlementSteps"
              :key="sIdx"
              class="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between"
            >
              <div class="flex items-center gap-1.5 font-bold text-[var(--foreground)]">
                <span>👤 {{ step.from }}</span>
                <span class="text-[var(--muted-foreground)]">→ pays →</span>
                <span>👤 {{ step.to }}</span>
              </div>
              <span class="font-mono font-black text-sm text-[var(--accent)]">
                \${{ step.amountUsd }} <span class="text-xs text-[var(--muted-foreground)] font-normal">(~€{{ step.amountEur }})</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Visual Breakdown -->
      <div class="card p-5 border border-[var(--border)] space-y-3">
        <h3 class="font-extrabold text-base text-[var(--foreground)] flex items-center gap-2">
          <span>📊</span>
          <span>Spending Breakdown by Category</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div
            v-for="cat in categoryBreakdown"
            :key="cat.name"
            @click="activeCategoryFilter = (activeCategoryFilter === cat.name ? 'all' : cat.name)"
            :class="[
              'p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.01]',
              activeCategoryFilter === cat.name
                ? 'bg-[var(--accent)]/15 border-[var(--accent)] ring-2 ring-[var(--accent)]'
                : 'bg-[var(--background)] hover:bg-[var(--card-hover)] border-[var(--border)]'
            ]"
          >
            <div>
              <div class="flex items-center justify-between">
                <span class="text-2xl">{{ cat.icon }}</span>
                <span class="text-xs font-mono font-bold text-[var(--muted-foreground)]">{{ cat.percent }}%</span>
              </div>
              <h4 class="font-bold text-sm text-[var(--foreground)] mt-2">{{ cat.name }}</h4>
              <p class="text-[11px] text-[var(--muted-foreground)] font-mono mt-0.5">
                \${{ cat.usd }} · {{ cat.count }} {{ cat.count === 1 ? 'item' : 'items' }}
              </p>
            </div>

            <div class="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden mt-3">
              <div class="h-full bg-[var(--accent)] rounded-full" :style="{ width: cat.percent + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Interactive Irish Tipping & Currency Etiquette Drawer -->
      <div class="card p-4 sm:p-5 border border-amber-500/30 bg-amber-500/[0.04] space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
            <span class="text-lg">💡</span>
            <h3>Irish Pub & Dining Tipping Rules of Thumb:</h3>
          </div>
          <button
            @click="showTippingGuide = !showTippingGuide"
            class="text-xs text-amber-400 font-bold hover:underline"
          >
            {{ showTippingGuide ? '▲ Hide Guide' : '▼ Show Guide' }}
          </button>
        </div>

        <div v-if="showTippingGuide" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs text-[var(--foreground)] animate-fadeIn">
          <div class="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-1">
            <strong>🍻 Pubs & Bars (Counter):</strong>
            <p class="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
              No tip is expected when ordering drinks at the bar. If ordering a large round with table service, rounding up change or leaving €1–€2 is appreciated.
            </p>
          </div>

          <div class="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-1">
            <strong>🍽️ Seated Restaurants:</strong>
            <p class="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
              10% to 12.5% is standard for good table service. Always check the receipt first—many Dublin/Galway spots already add an automatic 10% "Service Charge".
            </p>
          </div>

          <div class="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-1">
            <strong>🚕 Taxis & Transfers:</strong>
            <p class="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
              Round up to the nearest €2 or €5 (e.g. pay €20 on a €18.20 fare). Card / FreeNow contactless app is accepted in all Dublin/Galway cabs.
            </p>
          </div>

          <div class="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-1">
            <strong>🪙 Cash vs. Cards:</strong>
            <p class="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
              Apple Pay / Contactless cards work 99% of the time. Keep €30 in coins/cash for rural cliff parking meters (Moher/Dunloe) and trad music tip jars.
            </p>
          </div>
        </div>
      </div>

      <!-- Detailed Expenses Directory & Filter Controls -->
      <div class="card p-5 space-y-4 border border-[var(--border)]">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div class="space-y-0.5">
            <h3 class="font-extrabold text-base text-[var(--foreground)] flex items-center gap-2">
              <span>📋</span>
              <span>All Logged Expenses & Bookings</span>
            </h3>
            <p class="text-xs text-[var(--muted-foreground)]">
              Showing {{ filteredExpenses.length }} of {{ allExpenses.length }} trip entries
            </p>
          </div>

          <!-- Currency filter pills -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[10px] font-bold uppercase text-[var(--muted-foreground)]">Currency:</span>
            <button
              v-for="c in [
                { id: 'all', label: 'All' },
                { id: 'EUR', label: '€ EUR' },
                { id: 'GBP', label: '£ GBP' }
              ]"
              :key="c.id"
              @click="activeCurrencyFilter = c.id"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border',
                activeCurrencyFilter === c.id
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                  : 'bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]'
              ]"
            >
              {{ c.label }}
            </button>
          </div>
        </div>

        <!-- Search Bar & Filters -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Search expenses (e.g. 'Mister S', 'Hotel', 'Dad', 'Car')..."
            class="w-full sm:max-w-md px-3.5 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:ring-1 focus:ring-[var(--accent)]"
          />

          <!-- Category filter buttons -->
          <div class="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
            <button
              v-for="cat in ['all', 'Lodging', 'Transit', 'Dining', 'Activities']"
              :key="cat"
              @click="activeCategoryFilter = cat"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                activeCategoryFilter === cat
                  ? 'bg-[var(--foreground)] text-[var(--background)] shadow-sm font-bold'
                  : 'bg-[var(--card-hover)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              ]"
            >
              {{ cat === 'all' ? 'All Categories' : cat }}
            </button>
          </div>
        </div>

        <!-- Expense Cards / List -->
        <div class="space-y-2">
          <div
            v-for="exp in filteredExpenses"
            :key="exp.id"
            class="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card-hover)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <!-- Left: Icon, Category & Title -->
            <div class="flex items-start sm:items-center gap-2.5 min-w-0">
              <span class="text-xl flex-shrink-0">
                {{ exp.category === 'Lodging' ? '🏨' : (exp.category === 'Transit' ? '🚗' : (exp.category === 'Dining' ? '🍽️' : (exp.category === 'Activities' ? '🎟️' : '📦'))) }}
              </span>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <strong class="text-xs sm:text-sm text-[var(--foreground)]">{{ exp.title }}</strong>
                  <span class="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]">
                    {{ exp.category }}
                  </span>
                  <span v-if="exp.isPrepaid" class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    ✓ Pre-Booked
                  </span>
                </div>
                <p class="text-[11px] text-[var(--muted-foreground)] mt-0.5 truncate">
                  Paid by <strong class="text-[var(--foreground)]">{{ exp.payer || 'Dad' }}</strong>
                  <span v-if="exp.notes">· {{ exp.notes }}</span>
                </p>
              </div>
            </div>

            <!-- Right: Amount & Actions -->
            <div class="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
              <div class="text-right">
                <div class="font-mono font-black text-sm sm:text-base text-[var(--foreground)]">
                  {{ exp.currency === 'GBP' ? '£' : '€' }}{{ parseFloat(exp.amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}
                </div>
                <div class="text-[10px] text-[var(--muted-foreground)] font-mono">
                  ~\${{ Math.round(exp.currency === 'GBP' ? exp.amount * gbpToUsd : exp.amount * eurToUsd) }} USD
                </div>
              </div>

              <!-- Delete custom expense -->
              <button
                v-if="exp.isCustom"
                @click.stop="deleteExpense(exp.id)"
                class="text-xs text-rose-400 hover:text-rose-300 font-bold p-1 transition-transform hover:scale-110"
                title="Remove expense"
              >
                🗑️
              </button>
            </div>
          </div>

          <div v-if="filteredExpenses.length === 0" class="card p-8 text-center text-xs text-[var(--muted-foreground)]">
            No expenses found matching your filter criteria.
          </div>
        </div>
      </div>
    </div>
  `
};
