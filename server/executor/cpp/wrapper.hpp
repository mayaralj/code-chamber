#pragma once
#include <iostream>
#include <vector>
#include <string>
#include <utility>
#include <map>
#include <unordered_map>
#include <set>
#include <unordered_set>
#include <cmath>
#include <sstream>
#include <optional>
#include <nlohmann/json.hpp>
using namespace std;
using json = nlohmann::json;

void printResult(int x) { cout << x; }
void printResult(unsigned int x) { cout << x; }
void printResult(long x) { cout << x; }
void printResult(unsigned long x) { cout << x; }
void printResult(long long x) { cout << x; }
void printResult(unsigned long long x) { cout << x; }
void printResult(float x) { 
    if (isnan(x) || isinf(x)) {
    cout << "null";
    return;
    }
    cout << x; 
}
void printResult(double x) { 
    if (isnan(x) || isinf(x)) {
    cout << "null";
    return;
    }
    cout << x; 
}
void printResult(long double x) {
    if (isnan(x) || isinf(x)) {
    cout << "null";
    return;
    }
    cout << x; 
    }

void printResult(bool x) {
    cout << boolalpha << x;
}

void printResult(const string& x) {
  cout << '"';
  for (char c : x) {
    if (c == '\\') cout << "\\\\";
    else if (c == '"') cout << "\\\"";
    else if (c == '\n') cout << "\\n";
    else if (c == '\t') cout << "\\t";
    else cout << c;
  }
  cout << '"';
}

void printResult(char x) {
    printResult(string(1, x));
}

template <typename A, typename B>
void printResult(const pair<A, B>& p) {
    cout << "[";
    printResult(p.first);
    cout << ",";
    printResult(p.second);
    cout << "]";
}

template <typename T>
void printResult(const vector<T>& v) {
    cout << "[";
    for (size_t i = 0; i < v.size(); i++) {
    printResult(v[i]);
    if (i + 1 < v.size()) cout << ",";
    }
    cout << "]";
}

template <typename K>
void printKey(const K& k) {
  cout << '"';
  ostringstream oss;
  oss << k;
  string s = oss.str();
  for (char c : s) {
    if (c == '\\') cout << "\\\\";
    else if (c == '"') cout << "\\\"";
    else cout << c;
  }
  cout << '"';
}

template <typename K, typename V>
void printResult(const map<K, V>& m) {
    cout << "{";
    bool first = true;
    for (const auto& [k, v] : m) {
    if (!first) cout << ",";
    first = false;
    printKey(k);
    cout << ":";
    printResult(v);
    }
    cout << "}";
}

template <typename K, typename V>
void printResult(const unordered_map<K, V>& m) {
    cout << "{";
    bool first = true;
    for (const auto& [k, v] : m) {
    if (!first) cout << ",";
    first = false;
    printKey(k);
    cout << ":";
    printResult(v);
    }
    cout << "}";
}

template <typename T>
void printResult(const set<T>& s) {
    cout << "[";
    bool first = true;
    for (const auto& x : s) {
    if (!first) cout << ",";
    first = false;
    printResult(x);
    }
    cout << "]";
}

template <typename T>
void printResult(const unordered_set<T>& s) {
    cout << "[";
    bool first = true;
    for (const auto& x : s) {
    if (!first) cout << ",";
    first = false;
    printResult(x);
    }
    cout << "]";
}

template <typename T>
void printResult(const optional<T>& opt) {
    if (opt.has_value()) {
    printResult(opt.value());
    return;
    }
    cout << "null";
}